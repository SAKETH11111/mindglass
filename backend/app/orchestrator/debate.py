"""
DebateOrchestrator - Manages parallel streaming from all 8 agents
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
    """

    def __init__(self):
        self.agents = {
            agent_id: AgentClass()
            for agent_id, AgentClass in AGENT_REGISTRY.items()
        }
        self.token_count = 0
        self.start_time = None

    async def stream_debate(self, query: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream tokens from all 8 agents in parallel.

        Args:
            query: The user's query to debate

        Yields:
            Dict containing agent_token, agent_done, agent_error, or metrics messages
        """
        self.start_time = time.time()
        self.token_count = 0

        # Create a queue to collect tokens from all agents
        queue = asyncio.Queue()

        async def stream_agent(agent_id: str, agent):
            """Stream tokens from a single agent into the queue."""
            try:
                async for token in agent.stream_response(query):
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
                # Signal this agent is done
                await queue.put({
                    "type": "agent_done",
                    "agentId": agent_id,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })

        # Start all agents concurrently
        tasks = [
            asyncio.create_task(stream_agent(agent_id, agent))
            for agent_id, agent in self.agents.items()
        ]

        # Track which agents have completed
        agents_done = 0
        total_agents = len(self.agents)
        last_metrics_time = time.time()

        while agents_done < total_agents:
            try:
                token = await asyncio.wait_for(queue.get(), timeout=0.5)

                if token["type"] == "agent_done":
                    agents_done += 1
                elif token["type"] == "agent_error":
                    # Log error but continue with other agents
                    print(f"[{datetime.now().isoformat()}] Agent error: {token.get('agentId')} - {token.get('error')}")
                    yield token
                else:
                    if token["type"] == "agent_token":
                        # Count tokens (approximate by word count)
                        content = token.get("content", "")
                        self.token_count += len(content.split()) if content else 0
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
                # No tokens for 500ms, send metrics anyway
                current_time = time.time()
                elapsed = current_time - self.start_time
                tps = self.token_count / elapsed if elapsed > 0 else 0
                yield {
                    "type": "metrics",
                    "tokensPerSecond": round(tps),
                    "totalTokens": self.token_count,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                }
                last_metrics_time = current_time

        # Drain any remaining items from the queue
        while not queue.empty():
            try:
                token = queue.get_nowait()
                if token["type"] == "agent_token":
                    content = token.get("content", "")
                    self.token_count += len(content.split()) if content else 0
                    yield token
                elif token["type"] == "agent_error":
                    yield token
                # Skip agent_done messages since we've already counted them
            except asyncio.QueueEmpty:
                break

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
        await asyncio.gather(*tasks, return_exceptions=True)

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
