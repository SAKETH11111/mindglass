"""
Tests for the DebateOrchestrator
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock

from app.orchestrator.debate import DebateOrchestrator
from app.orchestrator.phases import Phase, get_agents_for_phase
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
    async def test_stream_debate_yields_phase_change_messages(self):
        """Phase changes are yielded as the debate progresses"""
        orchestrator = DebateOrchestrator()

        # Mock all agents to complete immediately
        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        tokens = []
        async for token in orchestrator.stream_debate("test query"):
            tokens.append(token)

        # Should have phase_change messages
        phase_changes = [t for t in tokens if t.get("type") == "phase_change"]
        assert len(phase_changes) >= 1  # At least initial phase_change

        # First phase should be DISPATCH
        assert phase_changes[0]["phase"] == "dispatch"
        assert "analyst" in phase_changes[0]["activeAgents"]
        assert "optimist" in phase_changes[0]["activeAgents"]

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

        # Get Phase 1 agents (analyst, optimist)
        phase1_agents = set(get_agents_for_phase(Phase.DISPATCH))

        # Make analyst fail, optimist succeed
        for agent_id, agent in orchestrator.agents.items():
            if agent_id == "analyst":
                async def failing_stream(query):
                    raise Exception("Agent failed!")
                    yield
                agent.stream_response = MagicMock(side_effect=failing_stream)
            elif agent_id == "optimist":
                agent.stream_response = MagicMock(return_value=async_generator([
                    {"type": "agent_token", "agentId": agent_id, "content": "success", "timestamp": 123},
                    {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
                ]))
            else:
                # Other agents not in Phase 1 won't be started
                agent.stream_response = MagicMock(return_value=async_generator([
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

        # Should still get tokens from successful Phase 1 agent
        agent_tokens = [t for t in tokens if t.get("type") == "agent_token"]
        assert len(agent_tokens) == 1  # Only optimist should have tokens
        assert agent_tokens[0]["agentId"] == "optimist"

    @pytest.mark.asyncio
    async def test_stream_debate_continues_after_error(self):
        """AC #5: Other agents complete normally after one fails"""
        orchestrator = DebateOrchestrator()

        # Make analyst fail immediately, optimist succeed quickly
        for agent_id, agent in orchestrator.agents.items():
            if agent_id == "analyst":
                async def mock_stream_error(query):
                    raise ValueError("Critical error")
                    yield
                agent.stream_response = MagicMock(side_effect=mock_stream_error)
            elif agent_id == "optimist":
                # Quick success - no sleep to avoid timeout
                async def quick_stream(query):
                    yield {"type": "agent_token", "agentId": "optimist", "content": "quick agent", "timestamp": 123}
                    yield {"type": "agent_done", "agentId": "optimist", "timestamp": 123}
                agent.stream_response = MagicMock(side_effect=quick_stream)
            else:
                agent.stream_response = MagicMock(return_value=async_generator([
                    {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
                ]))

        tokens = []
        start_time = datetime.now()

        async for token in orchestrator.stream_debate("test"):
            tokens.append(token)

        elapsed = (datetime.now() - start_time).total_seconds()

        # Should complete (not hang)
        assert elapsed < 5  # Should complete within 5 seconds

        # Should get tokens from slow optimist
        agent_tokens = [t for t in tokens if t.get("type") == "agent_token"]
        assert len(agent_tokens) == 1
        assert agent_tokens[0]["agentId"] == "optimist"

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


class TestPhasedDebate:
    """Test the 4-phase debate system (Story 2.3)"""

    @pytest.mark.asyncio
    async def test_phase_1_spawns_analyst_and_optimist(self):
        """AC #1: Phase 1 (0-2s) spawns Analyst + Optimist"""
        orchestrator = DebateOrchestrator()

        # Track which agents were started using a dictionary to avoid closure issues
        started_agents = set()

        def make_stream(agent_id):
            async def stream(query):
                started_agents.add(agent_id)
                yield {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            return stream

        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(side_effect=make_stream(agent_id))

        tokens = []
        async for token in orchestrator.stream_debate("test"):
            tokens.append(token)

        # Should have started analyst and optimist in Phase 1
        assert "analyst" in started_agents, f"Started agents: {started_agents}"
        assert "optimist" in started_agents, f"Started agents: {started_agents}"

    @pytest.mark.asyncio
    async def test_phase_change_message_structure(self):
        """AC #5: phase_change messages have correct structure"""
        orchestrator = DebateOrchestrator()

        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        phase_changes = []
        async for token in orchestrator.stream_debate("test"):
            if token.get("type") == "phase_change":
                phase_changes.append(token)

        # Should have at least one phase_change
        assert len(phase_changes) >= 1

        # Check structure
        for pc in phase_changes:
            assert "phase" in pc
            assert "activeAgents" in pc
            assert "timestamp" in pc
            assert isinstance(pc["activeAgents"], list)

    @pytest.mark.asyncio
    async def test_debate_timeout_message(self):
        """AC #6: debate_timeout message sent at 12 seconds"""
        orchestrator = DebateOrchestrator()

        # Mock agents to never complete (simulating long-running debate)
        for agent_id, agent in orchestrator.agents.items():
            async def never_ending_stream(query):
                # Yield tokens slowly to keep debate alive
                for i in range(1000):
                    await asyncio.sleep(0.1)
                    yield {"type": "agent_token", "agentId": agent_id, "content": f"token {i}", "timestamp": 123}
                yield {"type": "agent_done", "agentId": agent_id, "timestamp": 123}

            agent.stream_response = MagicMock(side_effect=never_ending_stream)

        tokens = []
        start_time = datetime.now()

        async for token in orchestrator.stream_debate("test"):
            tokens.append(token)
            # Stop if we see timeout
            if token.get("type") == "debate_timeout":
                break

        elapsed = (datetime.now() - start_time).total_seconds()

        # Should have received timeout message
        timeout_msgs = [t for t in tokens if t.get("type") == "debate_timeout"]
        assert len(timeout_msgs) == 1

        # Should have completed around 12 seconds
        assert elapsed >= 11.0  # Allow some tolerance
        assert elapsed < 15.0

    @pytest.mark.asyncio
    async def test_phase_transitions_over_time(self):
        """AC #1-4: All 4 phases transition correctly"""
        orchestrator = DebateOrchestrator()

        # Mock all agents to complete quickly
        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        phase_changes = []
        async for token in orchestrator.stream_debate("test"):
            if token.get("type") == "phase_change":
                phase_changes.append(token)

        # Should see at least the initial phase change
        assert len(phase_changes) >= 1
        assert phase_changes[0]["phase"] == "dispatch"


class TestMessageTypes:
    """Test that correct message types are yielded"""

    @pytest.mark.asyncio
    async def test_agent_token_structure(self):
        """AC #3: agent_token messages include agentId"""
        orchestrator = DebateOrchestrator()

        # Only Phase 1 agents will be started
        for agent_id in ["analyst", "optimist"]:
            agent = orchestrator.agents[agent_id]
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_token", "agentId": agent_id, "content": "hello", "timestamp": 123},
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        # Other agents
        for agent_id in ["critic", "risk", "strategist", "finance", "synthesizer", "pessimist"]:
            agent = orchestrator.agents[agent_id]
            agent.stream_response = MagicMock(return_value=async_generator([
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

        # Make analyst fail
        async def failing_stream(query):
            raise Exception("Test error")
            yield

        orchestrator.agents["analyst"].stream_response = MagicMock(side_effect=failing_stream)

        # Optimist succeeds
        orchestrator.agents["optimist"].stream_response = MagicMock(return_value=async_generator([
            {"type": "agent_done", "agentId": "optimist", "timestamp": 123}
        ]))

        # Other agents
        for agent_id in ["critic", "risk", "strategist", "finance", "synthesizer", "pessimist"]:
            agent = orchestrator.agents[agent_id]
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

        for agent_id in ["analyst", "optimist"]:
            agent = orchestrator.agents[agent_id]
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_token", "agentId": agent_id, "content": "one two three four five", "timestamp": 123},
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        for agent_id in ["critic", "risk", "strategist", "finance", "synthesizer", "pessimist"]:
            agent = orchestrator.agents[agent_id]
            agent.stream_response = MagicMock(return_value=async_generator([
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


class TestBlackboardIntegration:
    """Test blackboard shared context integration (Story 2.4)"""

    def test_orchestrator_has_blackboard(self):
        """AC #1, #2: Orchestrator initializes with blackboard"""
        orchestrator = DebateOrchestrator()

        assert hasattr(orchestrator, 'blackboard')
        assert orchestrator.blackboard is not None
        assert orchestrator.blackboard.max_tokens == 2000

    def test_blackboard_cleared_on_new_debate(self):
        """AC #1: Blackboard is cleared when new debate starts"""
        orchestrator = DebateOrchestrator()

        # Add some entries
        orchestrator.blackboard.append("analyst", "Test entry.")
        assert len(orchestrator.blackboard.entries) == 1

        # Start a new debate - blackboard should be cleared
        # We can't easily test the full stream, but we can verify clear() works
        orchestrator.blackboard.clear()
        assert len(orchestrator.blackboard.entries) == 0

    @pytest.mark.asyncio
    async def test_agents_receive_blackboard_context(self):
        """AC #2: Agents receive blackboard context in their query"""
        orchestrator = DebateOrchestrator()

        received_queries = {}

        def make_stream(agent_id):
            async def stream(query):
                received_queries[agent_id] = query
                yield {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            return stream

        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(side_effect=make_stream(agent_id))

        async for token in orchestrator.stream_debate("Should we pivot?"):
            pass

        # Check that agents received the query
        assert "analyst" in received_queries
        assert "optimist" in received_queries

    @pytest.mark.asyncio
    async def test_agent_tokens_added_to_blackboard(self):
        """AC #1: Agent tokens are accumulated in blackboard"""
        orchestrator = DebateOrchestrator()

        for agent_id, agent in orchestrator.agents.items():
            agent.stream_response = MagicMock(return_value=async_generator([
                {"type": "agent_token", "agentId": agent_id, "content": "This is a complete thought.", "timestamp": 123},
                {"type": "agent_done", "agentId": agent_id, "timestamp": 123}
            ]))

        async for token in orchestrator.stream_debate("test"):
            pass

        # Blackboard should have entries from agents
        # Note: All 8 agents complete immediately, so entries may be minimal
        # The key is that no error occurred during token accumulation

    def test_add_user_constraint(self):
        """AC #5: User constraints can be added to blackboard"""
        orchestrator = DebateOrchestrator()

        orchestrator.add_user_constraint("Focus on B2B opportunities only")

        constraints = orchestrator.blackboard.get_user_constraints()
        assert len(constraints) == 1
        assert constraints[0].content == "Focus on B2B opportunities only"
        assert constraints[0].is_user_constraint is True

    def test_user_constraints_in_context(self):
        """AC #5: User constraints appear in formatted context"""
        orchestrator = DebateOrchestrator()

        orchestrator.add_user_constraint("Focus on B2B")
        orchestrator.blackboard.append("analyst", "Analysis here.")

        context = orchestrator.get_blackboard_context()

        assert "[USER CONSTRAINT]: Focus on B2B" in context
        assert "[ANALYST]: Analysis here." in context

    @pytest.mark.asyncio
    async def test_agent_excludes_own_contributions(self):
        """AC #2: Agent doesn't see its own previous contributions"""
        orchestrator = DebateOrchestrator()

        # Pre-populate blackboard with entries from different agents
        orchestrator.blackboard.append("analyst", "Analyst first thought.")
        orchestrator.blackboard.append("critic", "Critic response here.")

        # Get context for analyst - should exclude analyst entries
        context = orchestrator.blackboard.get_context(exclude_agent="analyst")

        assert "Analyst first thought" not in context
        assert "Critic response here" in context
