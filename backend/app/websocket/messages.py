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


# Union type for all messages
WebSocketMessage = StartDebateMessage | AgentTokenMessage | DebateCompleteMessage | ErrorMessage | ConnectionAckMessage


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
