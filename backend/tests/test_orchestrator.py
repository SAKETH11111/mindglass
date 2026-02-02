"""
Tests for the DebateOrchestrator
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock

from app.orchestrator.debate import DebateOrchestrator
from app.agents import AGENT_REGISTRY


def async_generator(items):
    """Helper to create an async generator from a list."""
    async def gen():
        for item in items:
            yield item
    return gen()


class TestDebateOrchestrator:
    """Test DebateOrchestrator functionality"""

    def test_initialization(self):
        """AC #1: Orchestrator initializes all 8 agents from AGENT_REGISTRY"""
        orchestrator = DebateOrchestrator()

        assert len(orchestrator.agents) == 8
        for agent_id in AGENT_REGISTRY.keys():
            assert agent_id in orchestrator.agents
            assert orchestrator.agents[agent_id].agent_id == agent_id

    @pytest.mark.asyncio
    async def test_stream_debate_yields_tokens_from_all_agents(self):
        """AC #1, #2, #3: All 8 agents stream tokens with correct agentId"""
        orchestrator = DebateOrchestrator()

        # Mock agent responses using async generator
        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_token", "agentId": agent_id, "content": f"test from {agent_id}", "timestamp": 123},
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        tokens = []
        async for token in orchestrator.stream_debate("test query"):
            tokens.append(token)

        # Should have tokens from all agents
        agent_tokens = [t for t in tokens if t.get("type") == "agent_token"]
        assert len(agent_tokens) == 8, f"Expected 8 tokens, got {len(agent_tokens)}: {agent_tokens}"

        # Each token should have correct agentId
        agent_ids = set(t["agentId"] for t in agent_tokens)
        assert len(agent_ids) == 8

    @pytest.mark.asyncio
    async def test_stream_debate_sends_agent_done_for_all(self):
        """AC #2: All agents signal completion"""
        orchestrator = DebateOrchestrator()

        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        # Should complete without hanging
        tokens = []
        async for token in orchestrator.stream_debate("test"):
            tokens.append(token)

        # If we get here, all agents completed
        assert True

    @pytest.mark.asyncio
    async def test_stream_debate_yields_metrics(self):
        """AC #4: Metrics messages are sent with tokensPerSecond and totalTokens"""
        orchestrator = DebateOrchestrator()

        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_token", "agentId": agent_id, "content": "test content here", "timestamp": 123},
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        metrics_tokens = []
        async for token in orchestrator.stream_debate("test"):
            if token.get("type") == "metrics":
                metrics_tokens.append(token)

        # Should get at least one metrics message
        assert len(metrics_tokens) >= 1

        # Check metrics structure
        for metrics in metrics_tokens:
            assert "tokensPerSecond" in metrics
            assert "totalTokens" in metrics
            assert isinstance(metrics["tokensPerSecond"], int)
            assert isinstance(metrics["totalTokens"], int)
            assert metrics["tokensPerSecond"] >= 0
            assert metrics["totalTokens"] >= 0

    @pytest.mark.asyncio
    async def test_stream_debate_handles_agent_error(self):
        """AC #5: Failed agent is skipped and others continue"""
        orchestrator = DebateOrchestrator()

        agent_list = list(orchestrator.agents.items())

        # First agent fails
        async def failing_stream(query):
            raise Exception("Agent failed!")
            yield {"type": "agent_done"}  # Never reached

        agent_list[0][1].stream_response = MagicMock(side_effect=failing_stream)

        # Others succeed
        for agent_id, agent in agent_list[1:]:
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_token", "agentId": agent_id, "content": "success", "timestamp": 123},
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        tokens = []
        error_tokens = []
        async for token in orchestrator.stream_debate("test"):
            tokens.append(token)
            if token.get("type") == "agent_error":
                error_tokens.append(token)

        # Should get error message for failed agent
        assert len(error_tokens) == 1
        assert error_tokens[0]["type"] == "agent_error"
        assert "error" in error_tokens[0]

        # Should still get tokens from successful agents
        agent_tokens = [t for t in tokens if t.get("type") == "agent_token"]
        assert len(agent_tokens) == 7  # 8 - 1 failed

    @pytest.mark.asyncio
    async def test_stream_debate_continues_after_error(self):
        """AC #5: Other agents complete normally after one fails"""
        orchestrator = DebateOrchestrator()

        agent_list = list(orchestrator.agents.items())

        # First agent fails immediately
        async def mock_stream_error(query):
            raise ValueError("Critical error")
            yield

        agent_list[0][1].stream_response = MagicMock(side_effect=mock_stream_error)

        # Others are slow but succeed
        async def slow_stream(agent_id):
            async def gen(query):
                await asyncio.sleep(0.01)
                yield {"type": "agent_token", "agentId": agent_id, "content": "slow agent", "timestamp": 123}
                yield {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            return gen

        for agent_id, agent in agent_list[1:]:
            agent.stream_response = MagicMock(side_effect=await slow_stream(agent_id))

        tokens = []
        start_time = datetime.now()

        async for token in orchestrator.stream_debate("test"):
            tokens.append(token)

        elapsed = (datetime.now() - start_time).total_seconds()

        # Should complete (not hang)
        assert elapsed < 5  # Should complete within 5 seconds

        # Should get tokens from slow agents
        agent_tokens = [t for t in tokens if t.get("type") == "agent_token"]
        assert len(agent_tokens) == 7

    def test_get_agent_info(self):
        """Test getting agent information"""
        orchestrator = DebateOrchestrator()
        info = orchestrator.get_agent_info()

        assert len(info) == 8

        for agent_id, agent_data in info.items():
            assert "name" in agent_data
            assert "description" in agent_data
            assert "color" in agent_data
            assert "capabilities" in agent_data
            assert isinstance(agent_data["capabilities"], list)


class TestMessageTypes:
    """Test that correct message types are yielded"""

    @pytest.mark.asyncio
    async def test_agent_token_structure(self):
        """AC #3: agent_token messages include agentId"""
        orchestrator = DebateOrchestrator()

        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_token", "agentId": agent_id, "content": "hello", "timestamp": 123},
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        found_token = False
        async for token in orchestrator.stream_debate("test"):
            if token.get("type") == "agent_token":
                assert "agentId" in token
                assert "content" in token
                assert "timestamp" in token
                found_token = True
                break

        assert found_token

    @pytest.mark.asyncio
    async def test_agent_error_structure(self):
        """AC #5: agent_error messages have correct structure"""
        orchestrator = DebateOrchestrator()

        agent_list = list(orchestrator.agents.items())

        # First agent fails
        async def failing_stream(query):
            raise Exception("Test error")
            yield

        agent_list[0][1].stream_response = MagicMock(side_effect=failing_stream)

        # Others succeed
        for agent_id, agent in agent_list[1:]:
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        found_error = False
        async for token in orchestrator.stream_debate("test"):
            if token.get("type") == "agent_error":
                assert "agentId" in token
                assert "error" in token
                assert "timestamp" in token
                found_error = True
                break

        assert found_error


class TestTokenCounting:
    """Test token counting for metrics"""

    @pytest.mark.asyncio
    async def test_token_counting_logic(self):
        """AC #4: Token counter tracks total tokens"""
        orchestrator = DebateOrchestrator()

        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(return_value=async_generator([
                # 5 words = ~5 tokens (rough approximation)
                {"type": "agent_token", "agentId": agent_id, "content": "one two three four five", "timestamp": 123},
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        found_metrics = False
        async for token in orchestrator.stream_debate("test"):
            if token.get("type") == "metrics":
                # Should have counted some tokens
                assert token["totalTokens"] > 0
                found_metrics = True
                break

        assert found_metrics
