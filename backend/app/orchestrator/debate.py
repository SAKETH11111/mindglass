"""
DebateOrchestrator - Phased multi-agent debate with conversation flow.

Phases:
  1. ANALYST: Analyst breaks down the problem first
  2. PARALLEL: 6 perspective agents respond in parallel (seeing Analyst's output)  
  3. SYNTHESIZER: Synthesizer summarizes all insights

This creates a natural conversation flow where agents can reference each other.
"""

import asyncio
import time
from typing import AsyncGenerator, Dict, Any, List
from datetime import datetime

from app.agents import AGENT_REGISTRY


# Agent groups for phased execution
PHASE_1_AGENTS = ["analyst"]
PHASE_2_AGENTS = ["optimist", "pessimist", "critic", "strategist", "finance", "risk"]
PHASE_3_AGENTS = ["synthesizer"]


class DebateOrchestrator:
    """
    Orchestrates phased streaming debate where agents can see prior context.
    
    - Phase 1: Analyst provides structured breakdown
    - Phase 2: 6 perspective agents debate in parallel (with Analyst context)
    - Phase 3: Synthesizer creates unified answer (with all context)
    """

    def __init__(self):
        self.agents = {
            agent_id: AgentClass()
            for agent_id, AgentClass in AGENT_REGISTRY.items()
        }
        self.token_count = 0
        self.start_time = None
        # Blackboard: stores completed agent outputs for context injection
        self.blackboard: Dict[str, str] = {}

    async def stream_debate(self, query: str, model: str = "pro") -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream phased debate where each phase sees prior context.

        Args:
            query: The user's query to debate
            model: The model tier to use ('fast' or 'pro')

        Yields:
            Dict containing agent_token, agent_done, phase_start, or metrics messages
        """
        self.start_time = time.time()
        self.token_count = 0
        self.blackboard = {}
        
        # Map tier to actual Cerebras model
        # Pro tier uses gpt-oss-120b with reasoning_effort for deeper analysis
        model_map = {
            "fast": "llama-3.3-70b",
            "pro": "qwen-3-32b",  # Best balance of speed + quality on Cerebras
        }
        model_id = model_map.get(model, "llama-3.3-70b")
        use_reasoning = model == "pro"  # Enable reasoning_effort for pro tier
        
        print(f"[{datetime.now().isoformat()}] Debate starting - model: {model_id}, tier: {model}")

        # === PHASE 1: Analyst ===
        yield {"type": "phase_start", "phase": 1, "name": "Analysis", "timestamp": int(datetime.now().timestamp() * 1000)}
        
        async for msg in self._run_phase(PHASE_1_AGENTS, query, model_id, use_reasoning):
            yield msg

        # === PHASE 2: Perspective Agents (parallel) ===
        yield {"type": "phase_start", "phase": 2, "name": "Perspectives", "timestamp": int(datetime.now().timestamp() * 1000)}
        
        # Build context from Phase 1
        phase1_context = self._build_context(PHASE_1_AGENTS)
        enriched_query = f"{query}\n\n---\nPRIOR ANALYSIS:\n{phase1_context}"
        
        async for msg in self._run_phase(PHASE_2_AGENTS, enriched_query, model_id, use_reasoning):
            yield msg

        # === PHASE 3: Synthesizer ===
        yield {"type": "phase_start", "phase": 3, "name": "Synthesis", "timestamp": int(datetime.now().timestamp() * 1000)}
        
        # Build context from all prior phases
        all_context = self._build_context(PHASE_1_AGENTS + PHASE_2_AGENTS)
        synthesis_query = f"{query}\n\n---\nFULL DEBATE CONTEXT:\n{all_context}"
        
        async for msg in self._run_phase(PHASE_3_AGENTS, synthesis_query, model_id, use_reasoning):
            yield msg

        # Final metrics
        elapsed = time.time() - self.start_time
        tps = self.token_count / elapsed if elapsed > 0 else 0
        yield {
            "type": "debate_complete",
            "totalTokens": self.token_count,
            "totalTime": round(elapsed, 2),
            "avgTokensPerSecond": round(tps),
            "timestamp": int(datetime.now().timestamp() * 1000)
        }

    def _build_context(self, agent_ids: List[str]) -> str:
        """Build context string from completed agent outputs."""
        context_parts = []
        for agent_id in agent_ids:
            if agent_id in self.blackboard:
                agent_name = self.agents[agent_id].name
                context_parts.append(f"[{agent_name}]:\n{self.blackboard[agent_id]}")
        return "\n\n".join(context_parts)

    async def _run_phase(
        self, 
        agent_ids: List[str], 
        query: str, 
        model_id: str,
        use_reasoning: bool
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Run a phase with agents streaming in parallel."""
        queue: asyncio.Queue = asyncio.Queue()
        running_tasks: list[asyncio.Task] = []
        agent_buffers: Dict[str, List[str]] = {aid: [] for aid in agent_ids}

        async def stream_agent(agent_id: str, agent, model_to_use: str):
            """Stream tokens from a single agent into the queue."""
            try:
                async for token in agent.stream_response(query, model_override=model_to_use, use_reasoning=use_reasoning):
                    # Buffer content for blackboard
                    if token["type"] == "agent_token":
                        agent_buffers[agent_id].append(token["content"])
                    await queue.put(token)
            except Exception as e:
                await queue.put({
                    "type": "agent_error",
                    "agentId": agent_id,
                    "error": str(e),
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })
                await queue.put({
                    "type": "agent_done",
                    "agentId": agent_id,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })

        # Start agents for this phase
        for agent_id in agent_ids:
            if agent_id in self.agents:
                task = asyncio.create_task(stream_agent(agent_id, self.agents[agent_id], model_id))
                running_tasks.append(task)

        # Track agent completion for THIS PHASE
        agents_done = 0
        total_agents_in_phase = len(agent_ids)
        last_metrics_time = time.time()

        while agents_done < total_agents_in_phase:
            try:
                token = await asyncio.wait_for(queue.get(), timeout=0.1)

                if token["type"] == "agent_done":
                    agents_done += 1
                    agent_id = token.get("agentId")
                    # Save to blackboard for next phase context
                    if agent_id in agent_buffers:
                        self.blackboard[agent_id] = "".join(agent_buffers[agent_id])
                    print(f"[{datetime.now().isoformat()}] Agent done: {agent_id} ({agents_done}/{total_agents_in_phase})")
                    yield token
                elif token["type"] == "agent_error":
                    print(f"[{datetime.now().isoformat()}] Agent error: {token.get('agentId')} - {token.get('error')}")
                    yield token
                else:
                    if token["type"] == "agent_token":
                        self.token_count += 1
                    yield token

                # Send metrics every 500ms
                current_time = time.time()
                if current_time - last_metrics_time >= 0.5:
                    elapsed = current_time - self.start_time
                    tps = self.token_count / elapsed if elapsed > 0 else 0
                    yield {
                        "type": "metrics",
                        "tokensPerSecond": round(tps),
                        "totalTokens": self.token_count,
                        "timestamp": int(datetime.now().timestamp() * 1000)
                    }
                    last_metrics_time = current_time

            except asyncio.TimeoutError:
                continue

        # Wait for all tasks to complete
        if running_tasks:
            await asyncio.gather(*running_tasks, return_exceptions=True)
