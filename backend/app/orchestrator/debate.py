"""
DebateOrchestrator - Real Multi-Round Debate System

This creates ACTUAL debate with back-and-forth:
  Round 1 (OPENING):    Analyst + Optimist present initial positions
  Round 2 (CHALLENGE):  Critic + Pessimist directly attack Round 1 arguments  
  Round 3 (DEFENSE):    Analyst + Optimist defend and refine their positions
  Round 4 (SYNTHESIS):  Strategist + Finance + Risk provide balanced analysis
  Round 5 (FINAL):      Synthesizer creates consensus from the full debate

Each round sees ALL prior arguments, creating real debate dynamics.
"""

import asyncio
import time
from typing import AsyncGenerator, Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass

from app.agents import AGENT_REGISTRY


@dataclass
class DebateRound:
    """Configuration for a debate round."""
    round_num: int
    name: str
    agents: List[str]
    context_prompt: str  # Instructions for how agents should respond this round


# Define the debate rounds - this creates actual back-and-forth
DEBATE_ROUNDS = [
    DebateRound(
        round_num=1,
        name="Opening Arguments",
        agents=["analyst", "optimist"],
        context_prompt="You are presenting your OPENING POSITION on this topic. Be clear and take a stance."
    ),
    DebateRound(
        round_num=2,
        name="Challenge",
        agents=["critic", "pessimist"],
        context_prompt="You are CHALLENGING the opening arguments. Directly address the Analyst and Optimist's specific claims. Quote them and explain why they're wrong or incomplete."
    ),
    DebateRound(
        round_num=3,
        name="Defense & Rebuttal",
        agents=["analyst", "optimist"],
        context_prompt="You are DEFENDING your position against the Critic and Pessimist's attacks. Address their specific objections. Acknowledge valid points but explain why your core argument still holds."
    ),
    DebateRound(
        round_num=4,
        name="Expert Analysis",
        agents=["strategist", "finance", "risk"],
        context_prompt="You've watched the debate unfold. Now provide your EXPERT PERSPECTIVE. Reference the back-and-forth between the other agents. Who had the stronger arguments? What did they miss?"
    ),
    DebateRound(
        round_num=5,
        name="Final Verdict",
        agents=["synthesizer"],
        context_prompt="The debate is complete. Synthesize ALL rounds into a final verdict. Note who 'won' each exchange, what was resolved, and what remains contested. Provide a clear recommendation."
    ),
]


class DebateOrchestrator:
    """
    Orchestrates a multi-round debate where agents actually respond to each other.
    
    Key features:
    - Agents see ALL prior round outputs (real conversation context)
    - Challenge/Defense rounds create actual back-and-forth
    - Agents are prompted to directly address each other by name
    - Creates visible "debate tension" in the UI
    """

    def __init__(self):
        self.agents = {
            agent_id: AgentClass()
            for agent_id, AgentClass in AGENT_REGISTRY.items()
        }
        self.token_count = 0
        self.start_time = None
        # Blackboard: stores completed agent outputs per round
        self.blackboard: Dict[int, Dict[str, str]] = {}  # {round_num: {agent_id: text}}
        # User constraints injected mid-debate
        self.user_constraints: List[str] = []
        
    def inject_constraint(self, constraint: str):
        """Inject a user constraint that all subsequent agents will see."""
        self.user_constraints.append(constraint)

    async def stream_debate(self, query: str, model: str = "pro") -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream a multi-round debate where agents respond to each other.

        Args:
            query: The user's query to debate
            model: The model tier to use ('fast' or 'pro')

        Yields:
            Dict containing agent_token, agent_done, round_start, or metrics messages
        """
        self.start_time = time.time()
        self.token_count = 0
        self.blackboard = {}
        self.user_constraints = []
        
        # Map tier to actual Cerebras model
        model_map = {
            "fast": "llama3.1-8b",
            "pro": "llama-3.3-70b",
        }
        model_id = model_map.get(model, "llama3.1-8b")
        use_reasoning = False  # Extended thinking not yet supported
        
        print(f"[{datetime.now().isoformat()}] Debate starting - model: {model_id}, tier: {model}")
        print(f"[{datetime.now().isoformat()}] Query: {query[:100]}...")

        # Run each debate round
        for round_config in DEBATE_ROUNDS:
            # Signal round start to frontend
            yield {
                "type": "round_start",
                "round": round_config.round_num,
                "name": round_config.name,
                "agents": round_config.agents,
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
            
            # Also emit phase_start for compatibility with existing frontend
            yield {
                "type": "phase_start", 
                "phase": round_config.round_num, 
                "name": round_config.name,
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
            
            print(f"[{datetime.now().isoformat()}] Round {round_config.round_num}: {round_config.name} - Agents: {round_config.agents}")
            
            # Build the debate context for this round
            debate_context = self._build_debate_context(round_config)
            
            # Create the enriched prompt with full context
            enriched_query = self._create_round_prompt(query, round_config, debate_context)
            print(
                f"[{datetime.now().isoformat()}] Round {round_config.round_num} prompt stats - "
                f"query_chars={len(query)}, context_chars={len(debate_context)}, enriched_chars={len(enriched_query)}, "
                f"model_id={model_id}"
            )
            
            # Run agents for this round
            async for msg in self._run_round(round_config, enriched_query, model_id, use_reasoning):
                yield msg

        # Final metrics
        elapsed = time.time() - self.start_time
        tps = self.token_count / elapsed if elapsed > 0 else 0
        
        print(f"[{datetime.now().isoformat()}] Debate complete - {self.token_count} tokens in {elapsed:.1f}s ({tps:.0f} t/s)")
        
        yield {
            "type": "debate_complete",
            "totalTokens": self.token_count,
            "totalTime": round(elapsed, 2),
            "avgTokensPerSecond": round(tps),
            "timestamp": int(datetime.now().timestamp() * 1000)
        }

    def _build_debate_context(self, current_round: DebateRound) -> str:
        """
        Build the full debate context up to this point.
        This is what makes it a REAL debate - agents see what others said.
        """
        if current_round.round_num == 1:
            return ""  # First round has no prior context
            
        context_parts = []
        
        # Add all prior rounds
        for round_num in range(1, current_round.round_num):
            if round_num in self.blackboard:
                round_config = DEBATE_ROUNDS[round_num - 1]
                context_parts.append(f"=== ROUND {round_num}: {round_config.name.upper()} ===")
                
                for agent_id, text in self.blackboard[round_num].items():
                    agent_name = self.agents[agent_id].name
                    # Clean up text (remove think tags for context)
                    clean_text = self._strip_think_tags(text)
                    context_parts.append(f"\n[{agent_name}]:\n{clean_text}")
                
                context_parts.append("")  # Empty line between rounds
        
        # Add user constraints if any
        if self.user_constraints:
            context_parts.append("=== USER CONSTRAINTS ===")
            for i, constraint in enumerate(self.user_constraints, 1):
                context_parts.append(f"{i}. {constraint}")
            context_parts.append("")
            
        return "\n".join(context_parts)

    def _strip_think_tags(self, text: str) -> str:
        """Remove <think>...</think> tags from text for cleaner context."""
        import re
        # Remove complete think tags
        text = re.sub(r'<think>[\s\S]*?</think>', '', text)
        # Remove incomplete think tags (streaming)
        text = re.sub(r'<think>[\s\S]*', '', text)
        return text.strip()

    def _create_round_prompt(self, original_query: str, round_config: DebateRound, debate_context: str) -> str:
        """Create the full prompt for this round including debate context."""
        parts = [
            f"ORIGINAL QUESTION: {original_query}",
            "",
            f"CURRENT ROUND: {round_config.name}",
            f"YOUR TASK: {round_config.context_prompt}",
        ]
        
        if debate_context:
            parts.extend([
                "",
                "=== DEBATE SO FAR ===",
                debate_context,
                "=== END OF PRIOR DEBATE ===",
                "",
                "Now respond to the above. Reference other agents BY NAME when you agree or disagree with them."
            ])
        
        return "\n".join(parts)

    async def _run_round(
        self, 
        round_config: DebateRound,
        enriched_query: str, 
        model_id: str,
        use_reasoning: bool
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Run all agents for a round in parallel, streaming their responses."""
        queue: asyncio.Queue = asyncio.Queue()
        running_tasks: list[asyncio.Task] = []
        agent_buffers: Dict[str, List[str]] = {aid: [] for aid in round_config.agents}
        agent_token_counts: Dict[str, int] = {aid: 0 for aid in round_config.agents}
        agent_start_times: Dict[str, float] = {}
        agent_first_token_times: Dict[str, float] = {}
        agent_last_token_times: Dict[str, float] = {}
        completed_agents: set[str] = set()
        last_status_log = time.time()
        
        # Initialize blackboard for this round
        self.blackboard[round_config.round_num] = {}

        async def stream_agent(agent_id: str, agent, model_to_use: str):
            """Stream tokens from a single agent into the queue."""
            try:
                agent_start_times[agent_id] = time.time()
                print(
                    f"[{datetime.now().isoformat()}] Agent start: {agent_id} "
                    f"(round {round_config.round_num}, model={model_to_use})"
                )
                async for token in agent.stream_response(enriched_query, model_override=model_to_use, use_reasoning=use_reasoning):
                    if token["type"] == "agent_token":
                        agent_buffers[agent_id].append(token["content"])
                        agent_token_counts[agent_id] += 1
                        now = time.time()
                        if agent_id not in agent_first_token_times:
                            agent_first_token_times[agent_id] = now
                            ttft = now - agent_start_times.get(agent_id, now)
                            print(
                                f"[{datetime.now().isoformat()}] Agent first token: {agent_id} "
                                f"ttft={ttft:.2f}s"
                            )
                        else:
                            last = agent_last_token_times.get(agent_id, now)
                            gap = now - last
                            if gap >= 5:
                                print(
                                    f"[{datetime.now().isoformat()}] Agent token gap: {agent_id} "
                                    f"gap={gap:.2f}s"
                                )
                        agent_last_token_times[agent_id] = now
                    await queue.put(token)
            except Exception as e:
                print(f"[{datetime.now().isoformat()}] Agent error {agent_id}: {e}")
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

        # Start all agents for this round
        for agent_id in round_config.agents:
            if agent_id in self.agents:
                task = asyncio.create_task(stream_agent(agent_id, self.agents[agent_id], model_id))
                running_tasks.append(task)

        # Track completion
        agents_done = 0
        total_agents = len(round_config.agents)
        last_metrics_time = time.time()

        while agents_done < total_agents:
            try:
                token = await asyncio.wait_for(queue.get(), timeout=0.1)

                if token["type"] == "agent_done":
                    agents_done += 1
                    agent_id = token.get("agentId")
                    if agent_id:
                        completed_agents.add(agent_id)
                    # Save to blackboard for next round
                    if agent_id in agent_buffers:
                        self.blackboard[round_config.round_num][agent_id] = "".join(agent_buffers[agent_id])
                    elapsed = None
                    if agent_id in agent_start_times:
                        elapsed = time.time() - agent_start_times[agent_id]
                    tps = 0
                    if elapsed and elapsed > 0:
                        tps = agent_token_counts.get(agent_id, 0) / elapsed
                    print(
                        f"[{datetime.now().isoformat()}] Agent done: {agent_id} "
                        f"(Round {round_config.round_num}: {agents_done}/{total_agents}) "
                        f"tokens={agent_token_counts.get(agent_id, 0)} elapsed={elapsed:.2f}s tps={tps:.1f}"
                    )
                    yield token
                elif token["type"] == "agent_error":
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
                now = time.time()
                if now - last_status_log >= 5:
                    pending_agents = [aid for aid in round_config.agents if aid not in completed_agents]
                    pending_status = []
                    for aid in pending_agents:
                        started = agent_start_times.get(aid)
                        last_token = agent_last_token_times.get(aid)
                        if started is None:
                            status = "not-started"
                        elif last_token is None:
                            status = f"started {now - started:.1f}s ago, no tokens"
                        else:
                            status = f"last token {now - last_token:.1f}s ago"
                        pending_status.append(f"{aid}: {status}")
                    print(
                        f"[{datetime.now().isoformat()}] Round {round_config.round_num} status - "
                        f"pending={pending_agents} | {', '.join(pending_status)} | queue={queue.qsize()}"
                    )
                    last_status_log = now
                continue

        # Wait for all tasks
        if running_tasks:
            await asyncio.gather(*running_tasks, return_exceptions=True)
