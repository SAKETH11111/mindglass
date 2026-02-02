"""
MindGlass Agents Module
"""

from app.agents.base import BaseAgent, LLMAgent
from app.agents.analyst import AnalystAgent
from app.agents.optimist import OptimistAgent
from app.agents.pessimist import PessimistAgent
from app.agents.critic import CriticAgent
from app.agents.strategist import StrategistAgent
from app.agents.finance import FinanceAgent
from app.agents.risk import RiskAgent
from app.agents.synthesizer import SynthesizerAgent

AGENT_REGISTRY = {
    "analyst": AnalystAgent,
    "optimist": OptimistAgent,
    "pessimist": PessimistAgent,
    "critic": CriticAgent,
    "strategist": StrategistAgent,
    "finance": FinanceAgent,
    "risk": RiskAgent,
    "synthesizer": SynthesizerAgent,
}

__all__ = [
    "BaseAgent",
    "LLMAgent",
    "AnalystAgent",
    "OptimistAgent",
    "PessimistAgent",
    "CriticAgent",
    "StrategistAgent",
    "FinanceAgent",
    "RiskAgent",
    "SynthesizerAgent",
    "AGENT_REGISTRY",
]
