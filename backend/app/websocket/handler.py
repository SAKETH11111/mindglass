import json
import asyncio
from typing import Dict, Set
from fastapi import WebSocket

class WebSocketManager:
    """
    Manages WebSocket connections for real-time communication.
    """

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_groups: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Accept and store a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        print(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, client_id: str) -> None:
        """Remove a WebSocket connection."""
        if client_id in self.active_connections:
            del self.active_connections[client_id]

        # Remove from all groups
        for group in self.connection_groups.values():
            group.discard(client_id)

        print(f"Client {client_id} disconnected. Total connections: {len(self.active_connections)}")

    async def send_message(self, client_id: str, message: Dict) -> bool:
        """Send a message to a specific client."""
        if client_id not in self.active_connections:
            return False

        try:
            websocket = self.active_connections[client_id]
            await websocket.send_json(message)
            return True
        except Exception as e:
            print(f"Error sending message to {client_id}: {e}")
            return False

    async def broadcast(self, message: Dict, exclude: str = None) -> None:
        """Broadcast a message to all connected clients."""
        disconnected = []

        for client_id, websocket in self.active_connections.items():
            if client_id == exclude:
                continue

            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to {client_id}: {e}")
                disconnected.append(client_id)

        # Clean up disconnected clients
        for client_id in disconnected:
            self.disconnect(client_id)

    async def send_to_group(self, group_id: str, message: Dict) -> None:
        """Send a message to all clients in a specific group."""
        if group_id not in self.connection_groups:
            return

        for client_id in self.connection_groups[group_id]:
            await self.send_message(client_id, message)

    def add_to_group(self, client_id: str, group_id: str) -> None:
        """Add a client to a connection group."""
        if group_id not in self.connection_groups:
            self.connection_groups[group_id] = set()

        self.connection_groups[group_id].add(client_id)

    def remove_from_group(self, client_id: str, group_id: str) -> None:
        """Remove a client from a connection group."""
        if group_id in self.connection_groups:
            self.connection_groups[group_id].discard(client_id)

    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return len(self.active_connections)

    async def handle_message(self, client_id: str, message: str) -> None:
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(message)
            message_type = data.get("type", "unknown")

            if message_type == "ping":
                await self.send_message(client_id, {"type": "pong"})

            elif message_type == "subscribe":
                group_id = data.get("group")
                if group_id:
                    self.add_to_group(client_id, group_id)
                    await self.send_message(client_id, {
                        "type": "subscribed",
                        "group": group_id
                    })

            elif message_type == "agent_request":
                # TODO: Route to orchestrator
                await self.send_message(client_id, {
                    "type": "agent_response",
                    "status": "received",
                    "data": data
                })

            else:
                # Echo message back
                await self.send_message(client_id, {
                    "type": "echo",
                    "original_message": data
                })

        except json.JSONDecodeError:
            await self.send_message(client_id, {
                "type": "error",
                "message": "Invalid JSON format"
            })
        except Exception as e:
            await self.send_message(client_id, {
                "type": "error",
                "message": str(e)
            })

# Global WebSocket manager instance
ws_manager = WebSocketManager()
