"""
MindGlass Backend - FastAPI Application
WebSocket-enabled real-time debate visualization platform
"""

import json
import asyncio
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
from dotenv import load_dotenv

from app.orchestrator.debate import DebateOrchestrator
from app.websocket.messages import create_debate_complete, create_error
from app.config import settings

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="MindGlass API",
    version="1.0.0",
    description="Real-time debate visualization platform"
)

# CORS middleware configuration - using centralized settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize orchestrator for multi-agent debates
orchestrator = DebateOrchestrator()


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }


@app.websocket("/ws/debate")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time debate communication.
    Handles start_debate messages and streams agent responses.
    """
    await websocket.accept()
    client_id = str(uuid.uuid4())
    connection_time = datetime.now().isoformat()
    print(f"[{connection_time}] WebSocket connected - Client: {client_id}")

    stream_task: asyncio.Task | None = None
    stream_id: str | None = None

    async def run_stream(query: str, model: str):
        try:
            print(f"[{datetime.now().isoformat()}] Stream start id={stream_id} model={model}")
            async for token in orchestrator.stream_debate(query, model):
                await websocket.send_json(token)
            await websocket.send_json(create_debate_complete())
            print(f"[{datetime.now().isoformat()}] Debate complete")
        except asyncio.CancelledError:
            print(f"[{datetime.now().isoformat()}] Debate stream cancelled")
        except Exception as e:
            error_msg = f"Error during streaming: {str(e)}"
            print(f"[{datetime.now().isoformat()}] {error_msg}")
            try:
                await websocket.send_json(create_error(error_msg))
            except Exception:
                pass

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            print(f"[{datetime.now().isoformat()}] WS recv: {data}")
            message = json.loads(data)

            # Handle start_debate message
            if message.get("type") == "start_debate":
                query = message.get("query", "").strip()
                model = message.get("model", "pro")  # Default to 'pro' tier

                # Validate query is not empty
                if not query:
                    await websocket.send_json(create_error("Query cannot be empty"))
                    continue

                print(f"[{datetime.now().isoformat()}] Starting debate - Query: {query[:50]}... | Model: {model}")

                # Cancel any existing stream
                if stream_task and not stream_task.done():
                    print(f"[{datetime.now().isoformat()}] Cancelling prior stream id={stream_id}")
                    stream_task.cancel()
                    await asyncio.sleep(0)

                # Start streaming in the background so we can handle injects
                stream_id = str(uuid.uuid4())
                stream_task = asyncio.create_task(run_stream(query, model))

            elif message.get("type") == "inject_constraint":
                # PRD Feature: Interrupt & Inject constraint mid-debate
                constraint = message.get("constraint", "").strip()
                if constraint:
                    print(f"[{datetime.now().isoformat()}] Constraint injected: {constraint}")
                    # Store constraint in orchestrator's user_constraints list
                    orchestrator.inject_constraint(constraint)
                    # Acknowledge the constraint injection immediately
                    ack = {
                        "type": "constraint_acknowledged",
                        "constraint": constraint,
                        "timestamp": int(datetime.now().timestamp() * 1000)
                    }
                    print(f"[{datetime.now().isoformat()}] WS send: {ack}")
                    await websocket.send_json(ack)
                else:
                    await websocket.send_json(create_error("Constraint cannot be empty"))

            else:
                # Unknown message type
                await websocket.send_json(create_error(f"Unknown message type: {message.get('type')}"))

    except WebSocketDisconnect:
        disconnection_time = datetime.now().isoformat()
        print(f"[{disconnection_time}] WebSocket disconnected - Client: {client_id}")
        if stream_task and not stream_task.done():
            stream_task.cancel()
    except json.JSONDecodeError as e:
        error_time = datetime.now().isoformat()
        print(f"[{error_time}] JSON decode error: {e}")
        await websocket.send_json(create_error("Invalid JSON message"))
    except Exception as e:
        error_time = datetime.now().isoformat()
        print(f"[{error_time}] WebSocket error: {e}")
        await websocket.send_json(create_error(f"Server error: {str(e)}"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
