"""
Tests for the agents module
"""

import pytest
from app.agents import (
    AGENT_REGISTRY,
    AnalystAgent,
    OptimistAgent,
    PessimistAgent,
    CriticAgent,
    StrategistAgent,
    FinanceAgent,
    RiskAgent,
    SynthesizerAgent,
)


class TestAgentRegistry:
    """Test AGENT_REGISTRY has all 8 agents"""

    def test_registry_has_all_agents(self):
        """AC #4: AGENT_REGISTRY maps agent_id to class for all 8 agents"""
        expected_agents = [
            "analyst",
            "optimist",
            "pessimist",
            "critic",
            "strategist",
            "finance",
            "risk",
            "synthesizer",
        ]
        for agent_id in expected_agents:
            assert agent_id in AGENT_REGISTRY, f"Missing agent: {agent_id}"

    def test_registry_values_are_classes(self):
        """AC #4: All registry values are agent classes"""
        for agent_id, agent_class in AGENT_REGISTRY.items():
            assert isinstance(agent_class, type), f"{agent_id} should be a class"


class TestAgentInstantiation:
    """Test all agents can be instantiated with correct properties"""

    def test_analyst_agent(self):
        """Test AnalystAgent instantiation"""
        agent = AnalystAgent()
        assert agent.agent_id == "analyst"
        assert agent.name == "Analyst"
        assert agent.color == "#5F8787"
        assert agent.system_prompt != ""

    def test_optimist_agent(self):
        """Test OptimistAgent instantiation - AC #2, #4"""
        agent = OptimistAgent()
        assert agent.agent_id == "optimist"
        assert agent.name == "Optimist"
        assert agent.color == "#E78A53"
        assert agent.system_prompt != ""
        assert "opportunity" in agent.system_prompt.lower()

    def test_pessimist_agent(self):
        """Test PessimistAgent instantiation - AC #2, #4"""
        agent = PessimistAgent()
        assert agent.agent_id == "pessimist"
        assert agent.name == "Pessimist"
        assert agent.color == "#FBCB97"
        assert agent.system_prompt != ""
        assert "risk" in agent.system_prompt.lower()

    def test_critic_agent(self):
        """Test CriticAgent instantiation - AC #2, #4"""
        agent = CriticAgent()
        assert agent.agent_id == "critic"
        assert agent.name == "Critic"
        assert agent.color == "#EF4444"
        assert agent.system_prompt != ""
        assert "flaw" in agent.system_prompt.lower() or "challenge" in agent.system_prompt.lower()

    def test_strategist_agent(self):
        """Test StrategistAgent instantiation - AC #2, #4"""
        agent = StrategistAgent()
        assert agent.agent_id == "strategist"
        assert agent.name == "Strategist"
        assert agent.color == "#A855F7"
        assert agent.system_prompt != ""
        assert "strategic" in agent.system_prompt.lower()

    def test_finance_agent(self):
        """Test FinanceAgent instantiation - AC #2, #4"""
        agent = FinanceAgent()
        assert agent.agent_id == "finance"
        assert agent.name == "Finance"
        assert agent.color == "#EAB308"
        assert agent.system_prompt != ""
        assert "financial" in agent.system_prompt.lower() or "roi" in agent.system_prompt.lower()

    def test_risk_agent(self):
        """Test RiskAgent instantiation - AC #2, #4"""
        agent = RiskAgent()
        assert agent.agent_id == "risk"
        assert agent.name == "Risk"
        assert agent.color == "#B91C1C"
        assert agent.system_prompt != ""
        assert "risk" in agent.system_prompt.lower()

    def test_synthesizer_agent(self):
        """Test SynthesizerAgent instantiation - AC #2, #4"""
        agent = SynthesizerAgent()
        assert agent.agent_id == "synthesizer"
        assert agent.name == "Synthesizer"
        assert agent.color == "#C1C1C1"
        assert agent.system_prompt != ""
        assert "consensus" in agent.system_prompt.lower() or "debate" in agent.system_prompt.lower()


class TestAgentPrompts:
    """Test agent prompts have required content - AC #3"""

    def test_all_prompts_reference_other_agents(self):
        """AC #3: Prompts instruct agents to reference each other by name"""
        agent_names = ["Analyst", "Optimist", "Pessimist", "Critic", "Strategist", "Finance", "Risk", "Synthesizer"]

        for agent_id, agent_class in AGENT_REGISTRY.items():
            agent = agent_class()
            prompt = agent.system_prompt

            # Check that prompt mentions other agents
            mentioned_names = [name for name in agent_names if name in prompt]
            mentioned_count = len(mentioned_names)
            
            # Synthesizer must reference all agents for consensus-building
            if agent_id == "synthesizer":
                assert mentioned_count >= 6, f"Synthesizer prompt should reference most agents, found: {mentioned_names}"
            else:
                # Other agents should reference at least 3 other agents
                assert mentioned_count >= 3, f"{agent_id} prompt should reference at least 3 agents, found: {mentioned_names}"

    def test_all_prompts_define_personality(self):
        """AC #2: Prompt defines agent's personality, role, and output format"""
        for agent_id, agent_class in AGENT_REGISTRY.items():
            agent = agent_class()
            prompt = agent.system_prompt.lower()

            assert "role" in prompt, f"{agent_id} should define ROLE"
            assert "personality" in prompt, f"{agent_id} should define PERSONALITY"


class TestAgentCapabilities:
    """Test agent capabilities are defined"""

    def test_all_agents_have_capabilities(self):
        """All agents should return non-empty capabilities list"""
        for agent_id, agent_class in AGENT_REGISTRY.items():
            agent = agent_class()
            caps = agent.get_capabilities()
            assert isinstance(caps, list), f"{agent_id} capabilities should be a list"
            assert len(caps) > 0, f"{agent_id} should have at least one capability"


class TestAgentColors:
    """Test agent colors per architecture - AC #2"""

    def test_agent_colors_match_spec(self):
        """AC #2: Agent colors match architecture specification"""
        expected_colors = {
            "analyst": "#5F8787",
            "optimist": "#E78A53",
            "pessimist": "#FBCB97",
            "critic": "#EF4444",
            "strategist": "#A855F7",
            "finance": "#EAB308",
            "risk": "#B91C1C",
            "synthesizer": "#C1C1C1",
        }

        for agent_id, expected_color in expected_colors.items():
            agent = AGENT_REGISTRY[agent_id]()
            assert agent.color == expected_color, f"{agent_id} color should be {expected_color}"
