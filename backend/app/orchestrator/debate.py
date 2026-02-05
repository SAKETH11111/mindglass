"""
DebateOrchestrator - Real Multi-Round Debate System

This creates ACTUAL debate with back-and-forth:
  Round 1 (OPENING):    Analyst + Optimist present initial positions
  Round 2 (CHALLENGE):  Critic + Pessimist directly attack Round 1 arguments  
  Round 3 (DEFENSE):    Analyst + Optimist defend and refine their positions
  Round 4 (SYNTHESIS):  Strategist + Finance + Risk provide balanced analysis
  Round 5 (FINAL):      Synthesizer creates consensus from the full debate

Each round sees ALL prior arguments, creating real debate dynamics.
Supports custom agent selection and follow-up questions with context.
"""

import asyncio
import time
from typing import AsyncGenerator, Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass

from app.agents import AGENT_REGISTRY
from app.agents.industry import get_industry_agent_registry, get_industry_agent_ids, INDUSTRY_AGENTS

# All available agent IDs
ALL_AGENT_IDS = ['analyst', 'optimist', 'pessimist', 'critic', 'strategist', 'finance', 'risk', 'synthesizer']


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


class RoundRestartRequested(Exception):
    """Raised when a constraint is injected mid-round and we need to restart the round."""


class DebateOrchestrator:
    """
    Orchestrates a multi-round debate where agents actually respond to each other.
    
    Key features:
    - Agents see ALL prior round outputs (real conversation context)
    - Challenge/Defense rounds create actual back-and-forth
    - Agents are prompted to directly address each other by name
    - Creates visible "debate tension" in the UI
    - Supports follow-up questions with previous session context
    - Supports custom agent selection
    - Supports industry-specific agents for tailored expertise
    """

    def __init__(self):
        # Agents will be initialized per-debate based on industry
        self.agents = {}
        self.token_count = 0
        self.start_time = None
        # Blackboard: stores completed agent outputs per round
        self.blackboard: Dict[int, Dict[str, str]] = {}  # {round_num: {agent_id: text}}
        # User constraints injected mid-debate
        self.user_constraints: List[str] = []
        self._interrupt_event: Optional[asyncio.Event] = None
        self._current_round_num: Optional[int] = None
        # Previous session context for follow-up questions
        self.previous_context: str = ""
        # Selected agents for this debate
        self.selected_agents: List[str] = ALL_AGENT_IDS
        # Industry context for tailored advice
        self.industry: str = ""
        # Benchmarking (populated per debate)
        self._bench_first_token_at: Optional[float] = None
        self._bench_rounds: Dict[int, Dict[str, Any]] = {}
        self._bench_agents: Dict[str, Dict[str, Any]] = {}

    def _reset_benchmarks(self) -> None:
        self._bench_first_token_at = None
        self._bench_rounds = {}
        self._bench_agents = {}

    def _is_retryable_error(self, error_text: str) -> bool:
        if not error_text:
            return False
        lower = error_text.lower()
        triggers = [
            "rate limit",
            "limit exceeded",
            "quota",
            "429",
            "timeout",
            "timed out",
            "deadline",
            "overloaded",
            "temporarily unavailable",
            "service unavailable",
        ]
        return any(trigger in lower for trigger in triggers)
    
    def _initialize_agents(self, industry: str = "", api_key_override: str | None = None):
        """Initialize agents based on industry context."""
        registry = get_industry_agent_registry(industry) if industry else AGENT_REGISTRY
        self.agents = {
            agent_id: AgentClass(api_key=api_key_override)
            for agent_id, AgentClass in registry.items()
        }
        print(f"[{datetime.now().isoformat()}] Initialized agents for industry '{industry or 'any'}': {list(self.agents.keys())}")

    def inject_constraint(self, constraint: str):
        """Inject a user constraint that all subsequent agents will see."""
        self.user_constraints.append(constraint)
        print(f"[{datetime.now().isoformat()}] Constraint injected! Total constraints: {len(self.user_constraints)}")
        # If a round is currently streaming, request a restart so all agents see the new constraint
        if self._interrupt_event is not None and self._current_round_num is not None:
            print(f"[{datetime.now().isoformat()}] Restart requested for round {self._current_round_num}")
            self._interrupt_event.set()

    async def stream_debate(
        self,
        query: str,
        model: str = "pro",
        previous_context: str = "",
        selected_agents: List[str] = None,
        industry: str = "",
        api_key_override: str | None = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream a multi-round debate where agents respond to each other.

        Args:
            query: The user's query to debate
            model: The model tier to use ('fast' or 'pro')
            previous_context: Context from previous turns in the same session
            selected_agents: Which agents to include (defaults to all)
            industry: Industry context for tailored advice (e.g., 'saas', 'fintech', 'healthcare')

        Yields:
            Dict containing agent_token, agent_done, round_start, or metrics messages
        """
        self.start_time = time.time()
        self.token_count = 0
        self.blackboard = {}
        self.user_constraints = []
        self._reset_benchmarks()
        self._interrupt_event = asyncio.Event()
        self._current_round_num = None
        self.previous_context = previous_context or ""
        self.industry = industry or ""  # Store industry context
        
        # Initialize agents based on industry (creates industry-specific specialists)
        self._initialize_agents(self.industry, api_key_override=api_key_override)
        
        # Get the appropriate agent IDs for this industry
        industry_agent_ids = get_industry_agent_ids(self.industry) if self.industry else ALL_AGENT_IDS
        
        # Filter selected agents to only include available ones
        if selected_agents:
            # Map generic agent IDs to industry-specific ones if needed
            self.selected_agents = []
            for agent_id in selected_agents:
                if agent_id in self.agents:
                    self.selected_agents.append(agent_id)
                elif agent_id == "finance" and self.industry in INDUSTRY_AGENTS:
                    # Map finance to first industry agent
                    industry_specific = list(INDUSTRY_AGENTS[self.industry].keys())[0]
                    self.selected_agents.append(industry_specific)
                elif agent_id == "risk" and self.industry in INDUSTRY_AGENTS:
                    # Map risk to second industry agent
                    industry_specific = list(INDUSTRY_AGENTS[self.industry].keys())[1]
                    self.selected_agents.append(industry_specific)
                else:
                    self.selected_agents.append(agent_id)
        else:
            self.selected_agents = industry_agent_ids
        
        # Always include synthesizer
        if 'synthesizer' not in self.selected_agents:
            self.selected_agents.append('synthesizer')
        
        # Map tier to actual Cerebras model
        model_map = {
            "fast": "llama3.1-8b",
            "pro": "gpt-oss-120b",  # GPT-OSS 120B for pro tier
        }
        model_id = model_map.get(model, "llama3.1-8b")
        # Disable reasoning for GPT-OSS (no <think> tags)
        use_reasoning = False
        
        print(f"[{datetime.now().isoformat()}] Debate starting - model: {model_id}, tier: {model}")
        print(f"[{datetime.now().isoformat()}] Selected agents: {self.selected_agents}")
        print(f"[{datetime.now().isoformat()}] Query: {query[:100]}...")
        if self.industry:
            print(f"[{datetime.now().isoformat()}] Industry context: {self.industry}")
        if self.previous_context:
            print(f"[{datetime.now().isoformat()}] Has previous context: {len(self.previous_context)} chars")

        # Build customized debate rounds based on selected agents
        debate_rounds = self._build_debate_rounds()
        
        # Run each debate round (with restart support)
        round_index = 0
        while round_index < len(debate_rounds):
            round_config = debate_rounds[round_index]
            self._current_round_num = round_config.round_num
            if self._interrupt_event.is_set():
                self._interrupt_event.clear()
            # Signal round start to frontend
            round_start_msg = {
                "type": "round_start",
                "round": round_config.round_num,
                "name": round_config.name,
                "agents": round_config.agents,
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
            yield round_start_msg
            
            # Also emit phase_start for compatibility with existing frontend
            phase_start_msg = {
                "type": "phase_start", 
                "phase": round_config.round_num, 
                "name": round_config.name,
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
            yield phase_start_msg
            
            print(f"[{datetime.now().isoformat()}] Round {round_config.round_num}: {round_config.name} - Agents: {round_config.agents}")
            
            # Build the debate context for this round
            debate_context = self._build_debate_context(round_config)
            
            # Create the enriched prompt with full context
            enriched_query = self._create_round_prompt(query, round_config, debate_context)
            
            # Log constraint status
            constraint_info = f", constraints={len(self.user_constraints)}" if self.user_constraints else ""
            print(
                f"[{datetime.now().isoformat()}] Round {round_config.round_num} prompt stats - "
                f"query_chars={len(query)}, context_chars={len(debate_context)}, enriched_chars={len(enriched_query)}, "
                f"model_id={model_id}{constraint_info}"
            )
            
            # Run agents for this round
            try:
                async for msg in self._run_round(
                    round_config,
                    enriched_query,
                    model_id,
                    use_reasoning,
                    fallback_model_id="llama3.1-8b",
                ):
                    yield msg
            except RoundRestartRequested:
                # Clear any partial outputs for this round and retry
                print(f"[{datetime.now().isoformat()}] Restarting round {round_config.round_num} due to constraint")
                print(f"[{datetime.now().isoformat()}] Constraints now: {self.user_constraints}")
                self.blackboard[round_config.round_num] = {}
                continue

            round_index += 1

        # Final metrics
        elapsed = time.time() - self.start_time
        tps = self.token_count / elapsed if elapsed > 0 else 0
        
        print(f"[{datetime.now().isoformat()}] Debate complete - {self.token_count} tokens in {elapsed:.1f}s ({tps:.0f} t/s)")
        
        self._current_round_num = None
        debate_complete_msg = {
            "type": "debate_complete",
            "totalTokens": self.token_count,
            "totalTime": round(elapsed, 2),
            "avgTokensPerSecond": round(tps),
            "benchmark": {
                "e2eMs": int(round(elapsed * 1000)),
                "firstTokenMs": int(round((self._bench_first_token_at - self.start_time) * 1000)) if self._bench_first_token_at else None,
                "rounds": self._bench_rounds,
                "agents": self._bench_agents,
            },
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        yield debate_complete_msg

    def _build_debate_rounds(self) -> List[DebateRound]:
        """
        Build customized debate rounds based on selected agents.
        Filters out rounds where no selected agents participate.
        Always ends with synthesizer round.
        """
        selected = set(self.selected_agents)
        customized_rounds = []
        round_num = 1
        
        # Opening: Analyst + Optimist
        opening_agents = [a for a in ["analyst", "optimist"] if a in selected]
        if opening_agents:
            customized_rounds.append(DebateRound(
                round_num=round_num,
                name="Opening Arguments",
                agents=opening_agents,
                context_prompt="You are presenting your OPENING POSITION on this topic. Be clear and take a stance."
            ))
            round_num += 1
        
        # Challenge: Critic + Pessimist
        challenge_agents = [a for a in ["critic", "pessimist"] if a in selected]
        if challenge_agents and opening_agents:  # Only if there were opening arguments to challenge
            customized_rounds.append(DebateRound(
                round_num=round_num,
                name="Challenge",
                agents=challenge_agents,
                context_prompt="You are CHALLENGING the opening arguments. Directly address the previous speakers' specific claims. Quote them and explain why they're wrong or incomplete."
            ))
            round_num += 1
            
            # Defense: Only if there was a challenge and opening agents are selected
            defense_agents = [a for a in ["analyst", "optimist"] if a in selected]
            if defense_agents:
                customized_rounds.append(DebateRound(
                    round_num=round_num,
                    name="Defense & Rebuttal",
                    agents=defense_agents,
                    context_prompt="You are DEFENDING your position against the challengers' attacks. Address their specific objections. Acknowledge valid points but explain why your core argument still holds."
                ))
                round_num += 1
        
        # Expert Analysis: Strategist + Finance/Industry + Risk/Industry
        # Use industry-specific agents if available
        expert_base = ["strategist"]
        if self.industry and self.industry in INDUSTRY_AGENTS:
            # Add industry-specific agents instead of generic finance/risk
            industry_agent_ids = list(INDUSTRY_AGENTS[self.industry].keys())
            expert_base.extend(industry_agent_ids)
        else:
            # Use generic finance and risk
            expert_base.extend(["finance", "risk"])
        
        expert_agents = [a for a in expert_base if a in selected]
        if expert_agents:
            # Customize prompt for industry if applicable
            industry_prompt = ""
            if self.industry:
                industry_labels = {
                    "saas": "SaaS/Software",
                    "ecommerce": "E-commerce/Retail",
                    "fintech": "Fintech/Banking",
                    "healthcare": "Healthcare/Biotech",
                    "manufacturing": "Manufacturing",
                    "consulting": "Consulting/Agency",
                    "media": "Media/Entertainment",
                    "realestate": "Real Estate",
                    "personal": "Personal Decision",
                }
                industry_name = industry_labels.get(self.industry, self.industry)
                industry_prompt = f" Apply your {industry_name} expertise specifically."
            
            customized_rounds.append(DebateRound(
                round_num=round_num,
                name="Expert Analysis",
                agents=expert_agents,
                context_prompt=f"You've watched the debate unfold. Now provide your EXPERT PERSPECTIVE. Reference the back-and-forth between the other agents. Who had the stronger arguments? What did they miss?{industry_prompt}"
            ))
            round_num += 1
        
        # Final Verdict: Synthesizer (always)
        if "synthesizer" in selected:
            customized_rounds.append(DebateRound(
                round_num=round_num,
                name="Final Verdict",
                agents=["synthesizer"],
                context_prompt="The debate is complete. Synthesize ALL rounds into a final verdict. Note who 'won' each exchange, what was resolved, and what remains contested. Provide a clear recommendation."
            ))
        
        return customized_rounds

    def _build_debate_context(self, current_round: DebateRound) -> str:
        """
        Build the full debate context up to this point.
        This is what makes it a REAL debate - agents see what others said.
        """
        context_parts = []
        
        # Add all prior rounds (skip if round 1)
        if current_round.round_num > 1:
            for round_num in range(1, current_round.round_num):
                if round_num in self.blackboard:
                    # Get round name from blackboard entries
                    round_agents = list(self.blackboard[round_num].keys())
                    context_parts.append(f"=== ROUND {round_num} ===")
                    
                    for agent_id, text in self.blackboard[round_num].items():
                        agent_name = self.agents[agent_id].name
                        # Clean up text (remove think tags for context)
                        clean_text = self._strip_think_tags(text)
                        context_parts.append(f"\n[{agent_name}]:\n{clean_text}")
                    
                    context_parts.append("")  # Empty line between rounds
        
        # Add user constraints ALWAYS (even for round 1, even if mid-round)
        # This ensures constraints injected during current round are visible
        if self.user_constraints:
            context_parts.append("=== USER CONSTRAINTS (FOLLOW THESE!) ===")
            for i, constraint in enumerate(self.user_constraints, 1):
                context_parts.append(f"{i}. {constraint}")
            context_parts.append("")
            print(
                f"[{datetime.now().isoformat()}] Context includes {len(self.user_constraints)} "
                f"constraint(s): {self.user_constraints}"
            )
            
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
        """Create the full prompt for this round including debate context and previous session context."""
        parts = []
        
        # Add industry context if provided for more tailored advice
        if self.industry:
            industry_labels = {
                'saas': 'SaaS / Software',
                'ecommerce': 'E-commerce / Retail',
                'fintech': 'Fintech / Banking',
                'healthcare': 'Healthcare / Biotech',
                'manufacturing': 'Manufacturing',
                'consulting': 'Consulting / Agency',
                'media': 'Media / Entertainment',
                'realestate': 'Real Estate',
                'personal': 'Personal Decision',
            }
            industry_name = industry_labels.get(self.industry, self.industry.title())
            parts.extend([
                f"INDUSTRY CONTEXT: {industry_name}",
                "Tailor all advice specifically to this industry's norms, challenges, and best practices.",
                "",
            ])
        
        # Add previous session context if this is a follow-up question
        if self.previous_context:
            parts.extend([
                "=== PREVIOUS CONSULTATION CONTEXT ===",
                "The user is continuing a consultation session. Here is what was previously discussed:",
                self.previous_context,
                "=== END OF PREVIOUS CONTEXT ===",
                "",
                "Now the user has a FOLLOW-UP QUESTION. Consider the above context when responding.",
                "",
            ])
        
        parts.extend([
            f"CURRENT QUESTION: {original_query}",
            "",
        ])

        if self.user_constraints:
            parts.extend([
                "CRITICAL USER CONSTRAINTS (FOLLOW EXACTLY):",
                *[f"{i}. {c}" for i, c in enumerate(self.user_constraints, 1)],
                "",
            ])

        parts.extend([
            f"CURRENT ROUND: {round_config.name}",
            f"YOUR TASK: {round_config.context_prompt}",
        ])
        
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
        use_reasoning: bool,
        fallback_model_id: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Run all agents for a round in parallel, streaming their responses."""
        round_wall_start = time.time()
        queue: asyncio.Queue = asyncio.Queue()
        running_tasks: list[asyncio.Task] = []
        agent_buffers: Dict[str, List[str]] = {aid: [] for aid in round_config.agents}
        agent_token_counts: Dict[str, int] = {aid: 0 for aid in round_config.agents}
        agent_start_times: Dict[str, float] = {}
        agent_first_token_times: Dict[str, float] = {}
        agent_last_token_times: Dict[str, float] = {}
        agent_itl_samples: Dict[str, List[float]] = {aid: [] for aid in round_config.agents}
        agent_api_metrics: Dict[str, Dict[str, Any]] = {}
        agent_model_used: Dict[str, str] = {}
        completed_agents: set[str] = set()
        last_status_log = time.time()
        
        # Initialize blackboard for this round
        self.blackboard[round_config.round_num] = {}

        async def stream_agent(agent_id: str, agent, model_to_use: str):
            """Stream tokens from a single agent into the queue."""
            try:
                agent_start_times[agent_id] = time.time()
                agent_model_used[agent_id] = model_to_use

                async def run_with_model(active_model: str) -> Optional[str]:
                    """Returns error text if we should retry/fail, otherwise None."""
                    sent_any = False
                    async for token in agent.stream_response(
                        enriched_query,
                        model_override=active_model,
                        use_reasoning=use_reasoning,
                    ):
                        # If the agent immediately yields an error token, treat it as retryable/fatal
                        if token.get("type") == "agent_token" and isinstance(token.get("content"), str):
                            if not sent_any and token["content"].startswith("[Error:"):
                                return token["content"]
                            sent_any = True
                        await queue.put(token)
                    return None

                print(
                    f"[{datetime.now().isoformat()}] Agent start: {agent_id} "
                    f"(round {round_config.round_num}, model={model_to_use})"
                )
                error_text = await run_with_model(model_to_use)
                if error_text and fallback_model_id and model_to_use != fallback_model_id and self._is_retryable_error(error_text):
                    agent_model_used[agent_id] = fallback_model_id
                    print(
                        f"[{datetime.now().isoformat()}] Agent retry: {agent_id} "
                        f"model={model_to_use} -> {fallback_model_id}"
                    )
                    error_text = await run_with_model(fallback_model_id)

                if error_text:
                    error_msg = error_text.replace("[Error:", "").replace("]", "").strip()
                    await queue.put({
                        "type": "agent_error",
                        "agentId": agent_id,
                        "error": error_msg or "Unknown error",
                        "timestamp": int(datetime.now().timestamp() * 1000)
                    })
                    await queue.put({
                        "type": "agent_done",
                        "agentId": agent_id,
                        "timestamp": int(datetime.now().timestamp() * 1000)
                    })
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
            if self._interrupt_event is not None and self._interrupt_event.is_set():
                self._interrupt_event.clear()
                print(f"[{datetime.now().isoformat()}] Round {round_config.round_num} interrupted; cancelling tasks")
                for task in running_tasks:
                    task.cancel()
                if running_tasks:
                    await asyncio.wait(running_tasks, timeout=1)
                while not queue.empty():
                    queue.get_nowait()
                raise RoundRestartRequested()
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
                        # Record per-agent benchmark
                        started = agent_start_times.get(agent_id)
                        first = agent_first_token_times.get(agent_id)
                        gaps = agent_itl_samples.get(agent_id, [])

                        def percentile(values: List[float], pct: float) -> Optional[float]:
                            if not values:
                                return None
                            xs = sorted(values)
                            idx = int(round((len(xs) - 1) * pct))
                            return xs[max(0, min(idx, len(xs) - 1))]

                        ttft_ms = int(round((first - started) * 1000)) if started and first else None
                        avg_itl_ms = int(round((sum(gaps) / len(gaps)) * 1000)) if gaps else None
                        p50_itl_ms = int(round(percentile(gaps, 0.50) * 1000)) if gaps else None
                        p95_itl_ms = int(round(percentile(gaps, 0.95) * 1000)) if gaps else None

                        api = agent_api_metrics.get(agent_id, {})
                        self._bench_agents[agent_id] = {
                            "round": round_config.round_num,
                            "model": agent_model_used.get(agent_id, model_id),
                            "ttftMs": ttft_ms,
                            "avgItlMs": avg_itl_ms,
                            "p50ItlMs": p50_itl_ms,
                            "p95ItlMs": p95_itl_ms,
                            "chunks": agent_token_counts.get(agent_id, 0),
                            "promptTokens": api.get("promptTokens"),
                            "completionTokens": api.get("completionTokens"),
                            "totalTokens": api.get("totalTokens"),
                            "completionTimeSec": api.get("completionTime"),
                            "tokensPerSecond": api.get("tokensPerSecond"),
                        }
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
                elif token["type"] == "agent_metrics":
                    # Keep API-provided usage + timing for benchmark report
                    agent_id = token.get("agentId")
                    if agent_id:
                        agent_api_metrics[agent_id] = {
                            "promptTokens": token.get("promptTokens"),
                            "completionTokens": token.get("completionTokens"),
                            "totalTokens": token.get("totalTokens"),
                            "completionTime": token.get("completionTime"),
                            "tokensPerSecond": token.get("tokensPerSecond"),
                        }
                    yield token
                else:
                    if token["type"] == "agent_token":
                        agent_id = token.get("agentId")
                        content = token.get("content")
                        if agent_id and isinstance(content, str) and not content.startswith("[Error:"):
                            now = time.time()
                            if agent_id not in agent_first_token_times:
                                agent_first_token_times[agent_id] = now
                                if self._bench_first_token_at is None:
                                    self._bench_first_token_at = now
                            else:
                                last = agent_last_token_times.get(agent_id)
                                if last is not None:
                                    agent_itl_samples.setdefault(agent_id, []).append(now - last)
                            agent_last_token_times[agent_id] = now

                            agent_buffers[agent_id].append(content)
                            agent_token_counts[agent_id] += 1
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
                if self._interrupt_event is not None and self._interrupt_event.is_set():
                    self._interrupt_event.clear()
                    print(f"[{datetime.now().isoformat()}] Round {round_config.round_num} interrupted during wait; cancelling tasks")
                    for task in running_tasks:
                        task.cancel()
                    if running_tasks:
                        await asyncio.wait(running_tasks, timeout=1)
                    while not queue.empty():
                        queue.get_nowait()
                    raise RoundRestartRequested()
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

        # Record round benchmark
        duration_ms = int(round((time.time() - round_wall_start) * 1000))
        self._bench_rounds[round_config.round_num] = {
            "name": round_config.name,
            "agents": round_config.agents,
            "durationMs": duration_ms,
        }
