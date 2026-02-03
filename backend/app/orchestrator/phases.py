"""
Debate Phase Configuration for MindGlass

Defines the 4-phase debate state machine with timing and agent assignments.
Total debate duration: 12 seconds maximum (per PRD NFR9)
"""

from enum import Enum, auto
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime


class Phase(Enum):
    """Debate phase enumeration"""
    IDLE = "idle"
    DISPATCH = "dispatch"       # Phase 1: 0-2s - Initial analysis and optimism
    CONFLICT = "conflict"       # Phase 2: 2-6s - Challenge and risk assessment
    SYNTHESIS = "synthesis"     # Phase 3: 6-9s - Strategy and financial planning
    CONVERGENCE = "convergence" # Phase 4: 9-12s - Final consensus and concerns
    COMPLETE = "complete"       # Debate finished


@dataclass
class PhaseConfig:
    """Configuration for a debate phase"""
    phase: Phase
    start_time: float  # seconds from debate start
    end_time: float    # seconds from debate start
    agents: List[str]  # agent_ids to activate in this phase
    description: str   # human-readable description


# Phase configurations per architecture/PRD design
# Timeline: 0s -> 2s -> 6s -> 9s -> 12s (hard timeout)
PHASE_CONFIGS = [
    PhaseConfig(
        phase=Phase.DISPATCH,
        start_time=0.0,
        end_time=2.0,
        agents=["analyst", "optimist"],
        description="Initial analysis and opportunity identification"
    ),
    PhaseConfig(
        phase=Phase.CONFLICT,
        start_time=2.0,
        end_time=6.0,
        agents=["critic", "risk"],
        description="Challenge assumptions and assess risks"
    ),
    PhaseConfig(
        phase=Phase.SYNTHESIS,
        start_time=6.0,
        end_time=9.0,
        agents=["strategist", "finance"],
        description="Strategic planning and financial analysis"
    ),
    PhaseConfig(
        phase=Phase.CONVERGENCE,
        start_time=9.0,
        end_time=12.0,
        agents=["synthesizer", "pessimist"],
        description="Final consensus and remaining concerns"
    ),
]

def get_phase_config(phase: Phase) -> Optional[PhaseConfig]:
    """Get configuration for a specific phase"""
    for config in PHASE_CONFIGS:
        if config.phase == phase:
            return config
    return None


def get_current_phase(elapsed: float) -> PhaseConfig:
    """
    Determine current phase based on elapsed time.

    Args:
        elapsed: Seconds since debate started

    Returns:
        PhaseConfig for the current phase, or COMPLETE if past all phases
    """
    for config in PHASE_CONFIGS:
        if config.start_time <= elapsed < config.end_time:
            return config

    # If past all phases, we're in completion
    return PhaseConfig(
        phase=Phase.COMPLETE,
        start_time=12.0,
        end_time=float('inf'),
        agents=[],
        description="Debate complete"
    )


def get_agents_for_phase(phase: Phase) -> List[str]:
    """Get list of agent IDs that should be active in a given phase"""
    config = get_phase_config(phase)
    return config.agents if config else []


def get_all_phases() -> List[Phase]:
    """Get all debate phases in order"""
    return [config.phase for config in PHASE_CONFIGS]


def create_phase_change_message(phase: Phase, active_agents: List[str]) -> dict:
    """
    Create a phase_change message for the frontend.

    Args:
        phase: The current phase
        active_agents: List of currently active agent IDs

    Returns:
        Dictionary representing the phase_change message
    """
    return {
        "type": "phase_change",
        "phase": phase.value,
        "activeAgents": active_agents,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }


def get_phase_time_remaining(elapsed: float) -> float:
    """Get time remaining in current phase"""
    current_phase = get_current_phase(elapsed)
    return max(0.0, current_phase.end_time - elapsed)
