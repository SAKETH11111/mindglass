"""
MindGlass Orchestrator Module
"""

from app.orchestrator.debate import DebateOrchestrator
from app.orchestrator.phases import (
    Phase,
    PhaseConfig,
    PHASE_CONFIGS,
    get_current_phase,
    get_agents_for_phase,
    create_phase_change_message,
)
from app.orchestrator.blackboard import Blackboard, BlackboardEntry

__all__ = [
    "DebateOrchestrator",
    "Phase",
    "PhaseConfig",
    "PHASE_CONFIGS",
    "get_current_phase",
    "get_agents_for_phase",
    "create_phase_change_message",
    "Blackboard",
    "BlackboardEntry",
]
