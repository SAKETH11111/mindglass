"""
Tests for the Debate Phase Configuration
"""

import pytest
from datetime import datetime

from app.orchestrator.phases import (
    Phase,
    PhaseConfig,
    PHASE_CONFIGS,
    DEBATE_HARD_TIMEOUT,
    get_phase_config,
    get_current_phase,
    get_agents_for_phase,
    create_phase_change_message,
    create_debate_timeout_message,
    is_debate_complete,
    get_time_remaining,
    get_phase_time_remaining,
)


class TestPhaseEnum:
    """Test Phase enumeration"""

    def test_phase_values(self):
        """AC #1-4: Phase enum has correct values"""
        assert Phase.IDLE.value == "idle"
        assert Phase.DISPATCH.value == "dispatch"
        assert Phase.CONFLICT.value == "conflict"
        assert Phase.SYNTHESIS.value == "synthesis"
        assert Phase.CONVERGENCE.value == "convergence"
        assert Phase.COMPLETE.value == "complete"


class TestPhaseConfigs:
    """Test phase configuration constants"""

    def test_phase_configs_exist(self):
        """AC #1-4: PHASE_CONFIGS defines all 4 phases"""
        assert len(PHASE_CONFIGS) == 4

        phases = [config.phase for config in PHASE_CONFIGS]
        assert Phase.DISPATCH in phases
        assert Phase.CONFLICT in phases
        assert Phase.SYNTHESIS in phases
        assert Phase.CONVERGENCE in phases

    def test_phase_1_dispatch_config(self):
        """AC #1: Phase 1 (0-2s) has Analyst + Optimist"""
        config = get_phase_config(Phase.DISPATCH)
        assert config is not None
        assert config.start_time == 0.0
        assert config.end_time == 2.0
        assert "analyst" in config.agents
        assert "optimist" in config.agents
        assert len(config.agents) == 2

    def test_phase_2_conflict_config(self):
        """AC #2: Phase 2 (2-6s) has Critic + Risk"""
        config = get_phase_config(Phase.CONFLICT)
        assert config is not None
        assert config.start_time == 2.0
        assert config.end_time == 6.0
        assert "critic" in config.agents
        assert "risk" in config.agents
        assert len(config.agents) == 2

    def test_phase_3_synthesis_config(self):
        """AC #3: Phase 3 (6-9s) has Strategist + Finance"""
        config = get_phase_config(Phase.SYNTHESIS)
        assert config is not None
        assert config.start_time == 6.0
        assert config.end_time == 9.0
        assert "strategist" in config.agents
        assert "finance" in config.agents
        assert len(config.agents) == 2

    def test_phase_4_convergence_config(self):
        """AC #4: Phase 4 (9-12s) has Synthesizer + Pessimist"""
        config = get_phase_config(Phase.CONVERGENCE)
        assert config is not None
        assert config.start_time == 9.0
        assert config.end_time == 12.0
        assert "synthesizer" in config.agents
        assert "pessimist" in config.agents
        assert len(config.agents) == 2

    def test_hard_timeout_constant(self):
        """AC #6: Hard timeout is 12 seconds"""
        assert DEBATE_HARD_TIMEOUT == 12.0


class TestGetCurrentPhase:
    """Test get_current_phase function"""

    def test_phase_1_at_start(self):
        """AC #1: Phase 1 begins at 0s"""
        config = get_current_phase(0.0)
        assert config.phase == Phase.DISPATCH

    def test_phase_1_during_first_two_seconds(self):
        """AC #1: Phase 1 active from 0-2s"""
        config = get_current_phase(1.5)
        assert config.phase == Phase.DISPATCH

    def test_phase_2_at_two_seconds(self):
        """AC #2: Phase 2 begins at 2s"""
        config = get_current_phase(2.0)
        assert config.phase == Phase.CONFLICT

    def test_phase_2_during_conflict_period(self):
        """AC #2: Phase 2 active from 2-6s"""
        config = get_current_phase(4.0)
        assert config.phase == Phase.CONFLICT

    def test_phase_3_at_six_seconds(self):
        """AC #3: Phase 3 begins at 6s"""
        config = get_current_phase(6.0)
        assert config.phase == Phase.SYNTHESIS

    def test_phase_3_during_synthesis_period(self):
        """AC #3: Phase 3 active from 6-9s"""
        config = get_current_phase(7.5)
        assert config.phase == Phase.SYNTHESIS

    def test_phase_4_at_nine_seconds(self):
        """AC #4: Phase 4 begins at 9s"""
        config = get_current_phase(9.0)
        assert config.phase == Phase.CONVERGENCE

    def test_phase_4_during_convergence_period(self):
        """AC #4: Phase 4 active from 9-12s"""
        config = get_current_phase(10.5)
        assert config.phase == Phase.CONVERGENCE

    def test_complete_after_timeout(self):
        """AC #6: Returns COMPLETE after 12s"""
        config = get_current_phase(12.0)
        assert config.phase == Phase.COMPLETE

    def test_complete_well_after_timeout(self):
        """AC #6: Returns COMPLETE well after 12s"""
        config = get_current_phase(15.0)
        assert config.phase == Phase.COMPLETE


class TestGetAgentsForPhase:
    """Test get_agents_for_phase function"""

    def test_dispatch_agents(self):
        """AC #1: Phase 1 agents are analyst and optimist"""
        agents = get_agents_for_phase(Phase.DISPATCH)
        assert set(agents) == {"analyst", "optimist"}

    def test_conflict_agents(self):
        """AC #2: Phase 2 agents are critic and risk"""
        agents = get_agents_for_phase(Phase.CONFLICT)
        assert set(agents) == {"critic", "risk"}

    def test_synthesis_agents(self):
        """AC #3: Phase 3 agents are strategist and finance"""
        agents = get_agents_for_phase(Phase.SYNTHESIS)
        assert set(agents) == {"strategist", "finance"}

    def test_convergence_agents(self):
        """AC #4: Phase 4 agents are synthesizer and pessimist"""
        agents = get_agents_for_phase(Phase.CONVERGENCE)
        assert set(agents) == {"synthesizer", "pessimist"}


class TestMessageCreation:
    """Test message creation functions"""

    def test_create_phase_change_message(self):
        """AC #5: phase_change message has correct structure"""
        msg = create_phase_change_message(Phase.DISPATCH, ["analyst", "optimist"])

        assert msg["type"] == "phase_change"
        assert msg["phase"] == "dispatch"
        assert "activeAgents" in msg
        assert "analyst" in msg["activeAgents"]
        assert "optimist" in msg["activeAgents"]
        assert "timestamp" in msg
        assert isinstance(msg["timestamp"], int)

    def test_create_phase_change_message_for_each_phase(self):
        """AC #5: phase_change works for all phases"""
        for phase in [Phase.DISPATCH, Phase.CONFLICT, Phase.SYNTHESIS, Phase.CONVERGENCE]:
            agents = get_agents_for_phase(phase)
            msg = create_phase_change_message(phase, agents)
            assert msg["phase"] == phase.value
            assert len(msg["activeAgents"]) == 2

    def test_create_debate_timeout_message(self):
        """AC #6: debate_timeout message has correct structure"""
        msg = create_debate_timeout_message()

        assert msg["type"] == "debate_timeout"
        assert "message" in msg
        assert "timestamp" in msg
        assert isinstance(msg["timestamp"], int)


class TestTimeHelpers:
    """Test time-related helper functions"""

    def test_is_debate_complete_at_start(self):
        """AC #6: Debate not complete at start"""
        assert is_debate_complete(0.0) is False

    def test_is_debate_complete_at_eleven_seconds(self):
        """AC #6: Debate not complete at 11s"""
        assert is_debate_complete(11.9) is False

    def test_is_debate_complete_at_timeout(self):
        """AC #6: Debate complete at 12s"""
        assert is_debate_complete(12.0) is True

    def test_is_debate_complete_after_timeout(self):
        """AC #6: Debate complete after 12s"""
        assert is_debate_complete(13.0) is True

    def test_get_time_remaining_at_start(self):
        """AC #6: 12 seconds remaining at start"""
        assert get_time_remaining(0.0) == 12.0

    def test_get_time_remaining_at_six_seconds(self):
        """AC #6: 6 seconds remaining at 6s"""
        assert get_time_remaining(6.0) == 6.0

    def test_get_time_remaining_after_timeout(self):
        """AC #6: 0 seconds remaining after timeout"""
        assert get_time_remaining(15.0) == 0.0

    def test_get_phase_time_remaining_in_dispatch(self):
        """Phase time remaining decreases correctly"""
        # At 0.5s in dispatch (ends at 2s), should have 1.5s remaining
        assert get_phase_time_remaining(0.5) == 1.5

    def test_get_phase_time_remaining_in_conflict(self):
        """Phase time remaining in conflict phase"""
        # At 3s in conflict (ends at 6s), should have 3s remaining
        assert get_phase_time_remaining(3.0) == 3.0


class TestPhaseConfigDataclass:
    """Test PhaseConfig dataclass"""

    def test_phase_config_creation(self):
        """PhaseConfig can be created with all fields"""
        config = PhaseConfig(
            phase=Phase.IDLE,
            start_time=0.0,
            end_time=1.0,
            agents=["test_agent"],
            description="Test phase"
        )
        assert config.phase == Phase.IDLE
        assert config.start_time == 0.0
        assert config.end_time == 1.0
        assert config.agents == ["test_agent"]
        assert config.description == "Test phase"

    def test_get_phase_config_returns_none_for_unknown(self):
        """get_phase_config returns None for phases not in PHASE_CONFIGS"""
        # IDLE and COMPLETE are not in PHASE_CONFIGS
        assert get_phase_config(Phase.IDLE) is None
        assert get_phase_config(Phase.COMPLETE) is None
