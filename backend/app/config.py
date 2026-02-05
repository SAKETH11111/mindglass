"""
Configuration management for MindGlass backend
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables"""

    # Application
    APP_NAME: str = "MindGlass API"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    ALLOWED_ORIGINS: list = [
        FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://prism-cerebras.vercel.app",
        "https://frontend-nine-iota-86.vercel.app",  # Vercel deployment
        "https://*.vercel.app",  # Allow all Vercel preview deployments
    ]

    # WebSocket
    WS_ENDPOINT: str = "/ws/debate"

    # Cerebras API (for future use)
    CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")


# Create settings instance
settings = Settings()
