"""
Scripted demo debate stream for preset prompts.

This lets the published app show the full PRISM experience without spending
API quota on the homepage examples.
"""

import asyncio
import time
from datetime import datetime
from typing import Any, AsyncGenerator


DEMO_ROUNDS = [
    {
        "round": 1,
        "name": "Opening Arguments",
        "agents": ["analyst", "optimist"],
    },
    {
        "round": 2,
        "name": "Challenge",
        "agents": ["critic", "pessimist"],
    },
    {
        "round": 3,
        "name": "Defense & Rebuttal",
        "agents": ["analyst", "optimist"],
    },
    {
        "round": 4,
        "name": "Expert Analysis",
        "agents": ["strategist", "finance", "risk"],
    },
    {
        "round": 5,
        "name": "Final Verdict",
        "agents": ["synthesizer"],
    },
]


DEMO_AGENT_TEXT = {
    "analyst": (
        "<think>Frame the decision around reversibility, signal quality, and the cost "
        "of waiting.</think>"
        "**My read:** treat this as a staged decision, not a binary leap. The strongest "
        "move is the one that creates new evidence quickly while keeping the downside "
        "bounded. Define the one metric that would prove the path is working, pick a "
        "small first cohort, and commit only after behavior matches the story."
    ),
    "optimist": (
        "<think>Push the upside: momentum, focus, and the hidden cost of hesitation.</think>"
        "The upside case is real. Moving now can sharpen priorities, create a clearer "
        "market signal, and prevent the team from spending months optimizing the wrong "
        "option. If the opportunity is directionally right, a small decisive move beats "
        "another round of abstract debate."
    ),
    "critic": (
        "<think>Challenge the easy version of the recommendation.</think>"
        "The weak point is assuming confidence equals evidence. A convincing narrative can "
        "hide missing data, especially when the decision feels urgent. Before committing, "
        "separate what people say they want from what they will actually choose, pay for, "
        "or change behavior around."
    ),
    "pessimist": (
        "<think>Make the downside concrete instead of generic.</think>"
        "The risk is not just being wrong. It is being wrong in a way that burns trust, "
        "attention, or runway before the team learns enough to course-correct. If the first "
        "step is too large, the downside can look like a product failure when it was really "
        "a sequencing failure."
    ),
    "strategist": (
        "<think>Reconcile the sides into a sequencing recommendation.</think>"
        "The strategic move is a controlled test with a public enough commitment to matter "
        "and a private enough blast radius to survive. Name the hypothesis, pick the smallest "
        "audience that can falsify it, and time-box the read. That preserves momentum while "
        "forcing the decision to meet reality."
    ),
    "finance": (
        "<think>Translate the decision into runway, opportunity cost, and break-even points.</think>"
        "Financially, model three thresholds: the minimum upside needed to justify the move, "
        "the maximum downside the team can absorb, and the point where waiting becomes more "
        "expensive than acting. If the first step improves expected value without locking the "
        "company in, it is worth taking."
    ),
    "risk": (
        "<think>Define the kill switch before recommending action.</think>"
        "Risk is manageable only with a kill switch. Predefine what failure means: the signal "
        "does not appear, the operational burden spikes, or the decision creates second-order "
        "problems the team cannot absorb. If any of those trip, pause and adjust before scaling."
    ),
    "synthesizer": (
        "<think>Give a decisive answer that uses the debate instead of averaging it.</think>"
        "**Recommendation: move forward through a staged test, not a blind commitment.** The "
        "optimistic case is right that momentum matters and hesitation has a cost. The critic "
        "is also right that confidence has to be proven with behavior, not vibes. Choose the "
        "smallest meaningful version of the decision, set clear guardrails, and decide after "
        "the first real signal. If the metrics hold, scale it. If they wobble, fix the premise "
        "before increasing the bet."
    ),
}


GENERIC_AGENT_TEXT = (
    "<think>Adapt the scripted demo to this selected perspective.</think>"
    "This perspective is weighing the decision through its own lens and looking for the "
    "highest-signal tradeoff. The key is to move in a way that creates evidence quickly, "
    "keeps downside bounded, and turns the next step into a clean decision point."
)


def _now_ms() -> int:
    return int(datetime.now().timestamp() * 1000)


def _chunks(text: str, size: int = 8) -> list[str]:
    words = text.split(" ")
    return [" ".join(words[i:i + size]) + (" " if i + size < len(words) else "") for i in range(0, len(words), size)]


async def stream_demo_debate(
    query: str,
    selected_agents: list[str] | None = None,
) -> AsyncGenerator[dict[str, Any], None]:
    """Stream a complete scripted debate using the normal WebSocket messages."""
    start = time.time()
    selected = set(selected_agents or [])
    if not selected:
        selected = {"analyst", "optimist", "critic", "pessimist", "strategist", "finance", "risk", "synthesizer"}
    selected.add("synthesizer")

    total_chunks = 0
    first_token_at: float | None = None
    bench_rounds: dict[str, Any] = {}
    bench_agents: dict[str, Any] = {}

    for round_config in DEMO_ROUNDS:
        agents = [agent for agent in round_config["agents"] if agent in selected]
        if not agents:
            continue

        round_start = time.time()
        yield {
            "type": "round_start",
            "round": round_config["round"],
            "name": round_config["name"],
            "agents": agents,
            "timestamp": _now_ms(),
        }
        yield {
            "type": "phase_start",
            "phase": round_config["round"],
            "name": round_config["name"],
            "agents": agents,
            "timestamp": _now_ms(),
        }
        await asyncio.sleep(0.2)

        for agent in agents:
            agent_start = time.time()
            text = DEMO_AGENT_TEXT.get(agent, GENERIC_AGENT_TEXT)
            if agent == "synthesizer":
                text = text.replace("the decision", f"'{query}'")

            chunk_count = 0
            for chunk in _chunks(text):
                if first_token_at is None:
                    first_token_at = time.time()
                chunk_count += 1
                total_chunks += 1
                yield {
                    "type": "agent_token",
                    "agentId": agent,
                    "content": chunk,
                    "timestamp": _now_ms(),
                }
                await asyncio.sleep(0.055)

            elapsed = max(time.time() - agent_start, 0.001)
            yield {
                "type": "agent_metrics",
                "agentId": agent,
                "tokensPerSecond": round(chunk_count / elapsed, 1),
                "totalTokens": chunk_count,
                "promptTokens": 0,
                "completionTokens": chunk_count,
                "completionTime": round(elapsed, 3),
                "timestamp": _now_ms(),
            }
            yield {
                "type": "agent_done",
                "agentId": agent,
                "timestamp": _now_ms(),
            }
            bench_agents[agent] = {
                "round": round_config["round"],
                "model": "scripted-demo",
                "ttftMs": 80,
                "avgItlMs": 55,
                "p50ItlMs": 55,
                "p95ItlMs": 70,
                "chunks": chunk_count,
                "promptTokens": 0,
                "completionTokens": chunk_count,
                "totalTokens": chunk_count,
                "completionTimeSec": round(elapsed, 3),
                "tokensPerSecond": round(chunk_count / elapsed, 1),
            }
            await asyncio.sleep(0.16)

        bench_rounds[str(round_config["round"])] = {
            "name": round_config["name"],
            "agents": agents,
            "durationMs": int(round((time.time() - round_start) * 1000)),
        }

    elapsed = max(time.time() - start, 0.001)
    yield {
        "type": "debate_complete",
        "totalTokens": total_chunks,
        "totalTime": round(elapsed, 2),
        "avgTokensPerSecond": round(total_chunks / elapsed),
        "benchmark": {
            "e2eMs": int(round(elapsed * 1000)),
            "firstTokenMs": int(round((first_token_at - start) * 1000)) if first_token_at else None,
            "rounds": bench_rounds,
            "agents": bench_agents,
        },
        "timestamp": _now_ms(),
    }
