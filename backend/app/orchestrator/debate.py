"""
DebateOrchestrator - Manages parallel streaming from all 8 agents with phased spawning
"""

import asyncio
import time
from typing import AsyncGenerator, Dict, Any, Set
from datetime import datetime

from app.agents import AGENT_REGISTRY
from app.orchestrator.phases import (
    Phase,
    get_current_phase,
    get_agents_for_phase,
    create_phase_change_message,
    create_debate_timeout_message,
    is_debate_complete,
    DEBATE_HARD_TIMEOUT,
)
from app.orchestrator.blackboard import Blackboard


class DebateOrchestrator:
    """
    Orchestrates parallel streaming from all 8 agents in the MindGlass debate system.
    Multiplexes tokens from multiple agents over a single WebSocket connection.
    Implements phased debate with 4 phases over 12 seconds.
    """

    def __init__(self):
        self.agents = {
            agent_id: AgentClass()
            for agent_id, AgentClass in AGENT_REGISTRY.items()
        }
        self.token_count = 0
        self.start_time = None
        self.current_phase = Phase.IDLE
        self.active_agents: Set[str] = set()
        self.phase_start_times: Dict[Phase, float] = {}
        self.blackboard = Blackboard(max_tokens=2000)

    async def stream_debate(self, query: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream tokens from agents with phased spawning over 12 seconds.

        Phase 1 (0-2s): Analyst + Optimist
        Phase 2 (2-6s): Critic + Risk
        Phase 3 (6-9s): Strategist + Finance
        Phase 4 (9-12s): Synthesizer + Pessimist

        Args:
            query: The user's query to debate

        Yields:
            Dict containing agent_token, agent_done, agent_error, metrics, or phase_change messages
        """
        self.start_time = time.time()
        self.token_count = 0
        self.current_phase = Phase.IDLE
        self.active_agents = set()
        self.phase_start_times = {}
        self.blackboard.clear()

        # Create a queue to collect tokens from all agents
        queue = asyncio.Queue()
        running_tasks: list[asyncio.Task] = []

        async def stream_agent(agent_id: str, agent):
            """Stream tokens from a single agent into the queue with blackboard integration."""
            try:
                # Get current context from blackboard (excluding this agent's own contributions)
                context = self.blackboard.get_context(exclude_agent=agent_id)

                # Augment query with blackboard context
                if context:
                    augmented_query = f"{context}\n\nQuestion: {query}"
                else:
                    augmented_query = query

                async for token in agent.stream_response(augmented_query):
                    # Add token content to blackboard for thought accumulation
                    if token.get("type") == "agent_token":
                        content = token.get("content", "")
                        if content:
                            self.blackboard.add_token(agent_id, content)
                    await queue.put(token)
            except Exception as e:
                # Send error message but don't stop others
                await queue.put({
                    "type": "agent_error",
                    "agentId": agent_id,
                    "error": str(e),
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })
            finally:
                # Flush any pending tokens to blackboard
                self.blackboard.flush_pending(agent_id)
                # Signal this agent is done
                await queue.put({
                    "type": "agent_done",
                    "agentId": agent_id,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })

        def start_agents_for_phase(agents_to_start: list[str]):
            """Start streaming for specified agents."""
            for agent_id in agents_to_start:
                if agent_id not in self.active_agents:
                    self.active_agents.add(agent_id)
                    agent = self.agents[agent_id]
                    task = asyncio.create_task(stream_agent(agent_id, agent))
                    running_tasks.append(task)

        def check_phase_transition(elapsed: float) -> bool:
            """Check if phase has changed and yield phase_change message if so."""
            new_phase_config = get_current_phase(elapsed)

            if new_phase_config.phase != self.current_phase:
                # Phase transition occurred
                old_phase = self.current_phase
                self.current_phase = new_phase_config.phase
                self.phase_start_times[self.current_phase] = elapsed

                # Start new agents for this phase
                agents_to_start = [
                    agent_id for agent_id in new_phase_config.agents
                    if agent_id not in self.active_agents
                ]
                start_agents_for_phase(agents_to_start)

                return True
            return False

        # Start Phase 1 immediately (at 0s)
        initial_phase_config = get_current_phase(0.0)
        self.current_phase = initial_phase_config.phase
        self.phase_start_times[self.current_phase] = 0.0
        start_agents_for_phase(initial_phase_config.agents)

        # Yield initial phase_change message
        yield create_phase_change_message(self.current_phase, list(self.active_agents))

        # Track agent completion
        agents_done = 0
        last_metrics_time = time.time()
        debate_ended = False

        while not debate_ended:
            elapsed = time.time() - self.start_time

            # Check for hard timeout at 12 seconds
            if is_debate_complete(elapsed):
                yield create_debate_timeout_message()
                debate_ended = True
                break

            # Check for phase transition
            if check_phase_transition(elapsed):
                # Yield phase_change message
                yield create_phase_change_message(self.current_phase, list(self.active_agents))

            # Get tokens from queue with short timeout
            try:
                token = await asyncio.wait_for(queue.get(), timeout=0.1)

                if token["type"] == "agent_done":
                    agents_done += 1
                    # Check if all active agents are done (end debate early if all done)
                    if agents_done >= len(self.active_agents):
                        # All active agents are done, debate can end
                        debate_ended = True
                elif token["type"] == "agent_error":
                    # Log error but continue with other agents
                    print(f"[{datetime.now().isoformat()}] Agent error: {token.get('agentId')} - {token.get('error')}")
                    yield token
                else:
                    if token["type"] == "agent_token":
                        # Count tokens (estimate: words * 1.3 for LLaMA tokenization)
                        content = token.get("content", "")
                        word_count = len(content.split()) if content else 0
                        self.token_count += int(word_count * 1.3 + 0.5)  # Round to nearest
                    yield token

                # Send metrics every 500ms
                current_time = time.time()
                if current_time - last_metrics_time >= 0.5:
                    elapsed_total = current_time - self.start_time
                    tps = self.token_count / elapsed_total if elapsed_total > 0 else 0
                    yield {
                        "type": "metrics",
                        "tokensPerSecond": round(tps),
                        "totalTokens": self.token_count,
                        "timestamp": int(datetime.now().timestamp() * 1000)
                    }
                    last_metrics_time = current_time

            except asyncio.TimeoutError:
                # No tokens for 100ms, continue loop to check phase/timeout
                continue

        # Send final metrics
        current_time = time.time()
        elapsed = current_time - self.start_time
        tps = self.token_count / elapsed if elapsed > 0 else 0
        yield {
            "type": "metrics",
            "tokensPerSecond": round(tps),
            "totalTokens": self.token_count,
            "timestamp": int(datetime.now().timestamp() * 1000)
        }

        # Cancel any remaining tasks
        for task in running_tasks:
            if not task.done():
                task.cancel()

        # Wait for all tasks to complete (with timeout to avoid hanging)
        if running_tasks:
            await asyncio.gather(*running_tasks, return_exceptions=True)

    def add_user_constraint(self, constraint: str) -> None:
        """Add a user constraint to the blackboard (AC #5)."""
        self.blackboard.append("user", constraint, is_user_constraint=True)

    def get_blackboard_context(self) -> str:
        """Get the current blackboard context for debugging/monitoring."""
        return self.blackboard.get_context()

    def get_agent_info(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all agents."""
        return {
            agent_id: {
                "name": agent.name,
                "description": agent.description,
                "color": getattr(agent, "color", "#808080"),
                "capabilities": agent.get_capabilities()
            }
            for agent_id, agent in self.agents.items()
        }
