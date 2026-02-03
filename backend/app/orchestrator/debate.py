"""
DebateOrchestrator - Manages parallel streaming from all 8 agents
All agents respond simultaneously - no phases, no timing delays.
"""

import asyncio
import time
from typing import AsyncGenerator, Dict, Any
from datetime import datetime

from app.agents import AGENT_REGISTRY


class DebateOrchestrator:
    """
    Orchestrates parallel streaming from all 8 agents in the MindGlass debate system.
    Multiplexes tokens from multiple agents over a single WebSocket connection.
    All 8 agents stream simultaneously in parallel.
    """

    def __init__(self):
        self.agents = {
            agent_id: AgentClass()
            for agent_id, AgentClass in AGENT_REGISTRY.items()
        }
        self.token_count = 0
        self.start_time = None

    async def stream_debate(self, query: str, model: str = "pro") -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream tokens from ALL 8 agents in parallel.

        Args:
            query: The user's query to debate
            model: The model tier to use ('fast' or 'pro')

        Yields:
            Dict containing agent_token, agent_done, agent_error, or metrics messages
        """
        self.start_time = time.time()
        self.token_count = 0
        
        # Map tier to actual model ID
        model_map = {
            "fast": "llama-3.3-70b",  # Using 70b for "fast" tier
            "pro": "llama-3.3-70b",    # Using 70b for "pro" tier (can be changed to larger model)
        }
        model_id = model_map.get(model, "llama-3.3-70b")
        print(f"[{datetime.now().isoformat()}] Using model: {model_id} (tier: {model})")

        # Create a queue to collect tokens from all agents
        queue: asyncio.Queue = asyncio.Queue()
        running_tasks: list[asyncio.Task] = []

        async def stream_agent(agent_id: str, agent, model_to_use: str):
            """Stream tokens from a single agent into the queue."""
            try:
                async for token in agent.stream_response(query, model_override=model_to_use):
                    await queue.put(token)
            except Exception as e:
                # Send error message but don't stop others
                await queue.put({
                    "type": "agent_error",
                    "agentId": agent_id,
                    "error": str(e),
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })
                # Also send done message on error since agent won't
                await queue.put({
                    "type": "agent_done",
                    "agentId": agent_id,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })
            # Note: No finally block - agents send their own agent_done message

        # Start ALL 8 agents in parallel immediately
        for agent_id, agent in self.agents.items():
            task = asyncio.create_task(stream_agent(agent_id, agent, model_id))
            running_tasks.append(task)

        # Track agent completion
        agents_done = 0
        total_agents = len(self.agents)
        last_metrics_time = time.time()
        completed_agents = []

        while agents_done < total_agents:
            # Get tokens from queue with short timeout
            try:
                token = await asyncio.wait_for(queue.get(), timeout=0.1)

                if token["type"] == "agent_done":
                    agents_done += 1
                    completed_agents.append(token.get("agentId"))
                    print(f"[{datetime.now().isoformat()}] Agent done: {token.get('agentId')} ({agents_done}/{total_agents})")
                    yield token
                elif token["type"] == "agent_error":
                    print(f"[{datetime.now().isoformat()}] Agent error: {token.get('agentId')} - {token.get('error')}")
                    yield token
                else:
                    if token["type"] == "agent_token":
                        # Count tokens
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
                # No tokens for 100ms, continue loop
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

        # Wait for all tasks to complete
        if running_tasks:
            await asyncio.gather(*running_tasks, return_exceptions=True)
