"""
WebSocket Message Protocol for MindGlass
Defines typed message structures for client-server communication
"""

from typing import TypedDict, Optional, Literal
from datetime import datetime


# Inbound messages (client → server)

class StartDebateMessage(TypedDict):
    """Message to start a debate with a query"""
    type: Literal["start_debate"]
    query: str


# Outbound messages (server → client)

class AgentTokenMessage(TypedDict):
    """Streaming token from an agent"""
    type: Literal["agent_token"]
    agentId: str
    content: str
    timestamp: int


class DebateCompleteMessage(TypedDict):
    """Signal that the debate is complete"""
    type: Literal["debate_complete"]
    timestamp: int


class ErrorMessage(TypedDict):
    """Error response"""
    type: Literal["error"]
    message: str
    timestamp: int


class ConnectionAckMessage(TypedDict):
    """Connection acknowledgment"""
    type: Literal["connection_ack"]
    client_id: str
    timestamp: int


class PhaseChangeMessage(TypedDict):
    """Debate phase change notification"""
    type: Literal["phase_change"]
    phase: str  # "dispatch", "conflict", "synthesis", "convergence"
    activeAgents: list[str]
    timestamp: int


class MetricsMessage(TypedDict):
    """Performance metrics during debate"""
    type: Literal["metrics"]
    tokensPerSecond: int
    totalTokens: int
    timestamp: int


class AgentDoneMessage(TypedDict):
    """Agent completed streaming"""
    type: Literal["agent_done"]
    agentId: str
    timestamp: int


class AgentErrorMessage(TypedDict):
    """Agent encountered an error"""
    type: Literal["agent_error"]
    agentId: str
    error: str
    timestamp: int


# Union type for all messages
WebSocketMessage = (
    StartDebateMessage |
    AgentTokenMessage |
    DebateCompleteMessage |
    ErrorMessage |
    ConnectionAckMessage |
    PhaseChangeMessage |
    MetricsMessage |
    AgentDoneMessage |
    AgentErrorMessage
)


def create_agent_token(agent_id: str, content: str) -> AgentTokenMessage:
    """Create an agent token message"""
    return {
        "type": "agent_token",
        "agentId": agent_id,
        "content": content,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }


def create_debate_complete() -> DebateCompleteMessage:
    """Create a debate complete message"""
    return {
        "type": "debate_complete",
        "timestamp": int(datetime.now().timestamp() * 1000)
    }


def create_error(message: str) -> ErrorMessage:
    """Create an error message"""
    return {
        "type": "error",
        "message": message,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }


def create_connection_ack(client_id: str) -> ConnectionAckMessage:
    """Create a connection acknowledgment message"""
    return {
        "type": "connection_ack",
        "client_id": client_id,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }


def create_phase_change(phase: str, active_agents: list[str]) -> PhaseChangeMessage:
    """Create a phase change message"""
    return {
        "type": "phase_change",
        "phase": phase,
        "activeAgents": active_agents,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }


def create_metrics(tokens_per_second: int, total_tokens: int) -> MetricsMessage:
    """Create a metrics message"""
    return {
        "type": "metrics",
        "tokensPerSecond": tokens_per_second,
        "totalTokens": total_tokens,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }


def create_agent_done(agent_id: str) -> AgentDoneMessage:
    """Create an agent done message"""
    return {
        "type": "agent_done",
        "agentId": agent_id,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }


def create_agent_error(agent_id: str, error: str) -> AgentErrorMessage:
    """Create an agent error message"""
    return {
        "type": "agent_error",
        "agentId": agent_id,
        "error": error,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }
