"""
MindGlass Backend - FastAPI Application
WebSocket-enabled real-time debate visualization platform
"""

import json
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

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
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

                try:
                    # Stream from ALL agents via orchestrator
                    async for token in orchestrator.stream_debate(query, model):
                        await websocket.send_json(token)

                    # Send completion message
                    await websocket.send_json(create_debate_complete())
                    print(f"[{datetime.now().isoformat()}] Debate complete")

                except Exception as e:
                    error_msg = f"Error during streaming: {str(e)}"
                    print(f"[{datetime.now().isoformat()}] {error_msg}")
                    await websocket.send_json(create_error(error_msg))

            else:
                # Unknown message type
                await websocket.send_json(create_error(f"Unknown message type: {message.get('type')}"))

    except WebSocketDisconnect:
        disconnection_time = datetime.now().isoformat()
        print(f"[{disconnection_time}] WebSocket disconnected - Client: {client_id}")
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
