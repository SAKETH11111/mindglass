from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
import os

from app.websocket.handler import ws_manager
from app.orchestrator.manager import orchestrator

load_dotenv()

app = FastAPI(title="MindGlass API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "MindGlass API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "connections": ws_manager.get_connection_count(),
        "agents": orchestrator.list_agents()
    }

# Agent management endpoints
@app.get("/agents")
async def list_agents():
    return {"agents": orchestrator.list_agents()}

@app.post("/agents/{agent_id}/register")
async def register_agent(agent_id: str, config: dict):
    success = orchestrator.register_agent(agent_id, config)
    return {"success": success, "agent_id": agent_id}

@app.get("/agents/{agent_id}/status")
async def get_agent_status(agent_id: str):
    status = orchestrator.get_agent_status(agent_id)
    return {"agent_id": agent_id, "status": status}

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    import uuid
    client_id = str(uuid.uuid4())

    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.handle_message(client_id, data)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        ws_manager.disconnect(client_id)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
