"""
Configuration management for MindGlass backend
"""

import os
import httpx
from functools import lru_cache
from cerebras.cloud.sdk import Cerebras
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
    CEREBRAS_DEFAULT_MODEL: str = os.getenv("CEREBRAS_DEFAULT_MODEL", "gpt-oss-120b")
    CEREBRAS_FALLBACK_MODEL: str = os.getenv("CEREBRAS_FALLBACK_MODEL", "zai-glm-4.7")
    CEREBRAS_MAX_RETRIES: int = int(os.getenv("CEREBRAS_MAX_RETRIES", "3"))
    CEREBRAS_STREAM_MAX_RETRIES: int = int(os.getenv("CEREBRAS_STREAM_MAX_RETRIES", "0"))
    CEREBRAS_WARM_TCP_CONNECTION: bool = os.getenv("CEREBRAS_WARM_TCP_CONNECTION", "false").lower() == "true"
    CEREBRAS_TIMEOUT_SECONDS: float = float(os.getenv("CEREBRAS_TIMEOUT_SECONDS", "60"))
    CEREBRAS_CONNECT_TIMEOUT_SECONDS: float = float(os.getenv("CEREBRAS_CONNECT_TIMEOUT_SECONDS", "5"))
    CEREBRAS_READ_TIMEOUT_SECONDS: float = float(os.getenv("CEREBRAS_READ_TIMEOUT_SECONDS", "30"))
    CEREBRAS_WRITE_TIMEOUT_SECONDS: float = float(os.getenv("CEREBRAS_WRITE_TIMEOUT_SECONDS", "10"))
    CEREBRAS_MAX_PARALLEL_AGENTS: int = int(os.getenv("CEREBRAS_MAX_PARALLEL_AGENTS", "1"))
    CEREBRAS_RETRY_BACKOFF_SECONDS: float = float(os.getenv("CEREBRAS_RETRY_BACKOFF_SECONDS", "0.75"))
    CEREBRAS_CONTEXT_CHARS_PER_AGENT: int = int(os.getenv("CEREBRAS_CONTEXT_CHARS_PER_AGENT", "1200"))
    CEREBRAS_PREVIOUS_CONTEXT_MAX_CHARS: int = int(os.getenv("CEREBRAS_PREVIOUS_CONTEXT_MAX_CHARS", "4000"))
    CEREBRAS_MAX_TOKENS_OPENING: int = int(os.getenv("CEREBRAS_MAX_TOKENS_OPENING", "140"))
    CEREBRAS_MAX_TOKENS_CHALLENGE: int = int(os.getenv("CEREBRAS_MAX_TOKENS_CHALLENGE", "140"))
    CEREBRAS_MAX_TOKENS_DEFENSE: int = int(os.getenv("CEREBRAS_MAX_TOKENS_DEFENSE", "140"))
    CEREBRAS_MAX_TOKENS_EXPERT: int = int(os.getenv("CEREBRAS_MAX_TOKENS_EXPERT", "160"))
    CEREBRAS_MAX_TOKENS_FINAL: int = int(os.getenv("CEREBRAS_MAX_TOKENS_FINAL", "220"))

    # OpenRouter backup
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    OPENROUTER_FALLBACK_MODEL: str = os.getenv(
        "OPENROUTER_FALLBACK_MODEL",
        "nvidia/nemotron-3-nano-30b-a3b:free",
    )
    OPENROUTER_MIN_MAX_TOKENS: int = int(os.getenv("OPENROUTER_MIN_MAX_TOKENS", "220"))
    OPENROUTER_PROVIDER_SORT: str = os.getenv("OPENROUTER_PROVIDER_SORT", "throughput")
    OPENROUTER_HTTP_REFERER: str = os.getenv("OPENROUTER_HTTP_REFERER", FRONTEND_URL)
    OPENROUTER_APP_TITLE: str = os.getenv("OPENROUTER_APP_TITLE", APP_NAME)


# Create settings instance
settings = Settings()


def build_cerebras_client(api_key: str) -> Cerebras:
    """Create a Cerebras client with production-oriented retry and timeout defaults."""
    return Cerebras(
        api_key=api_key,
        timeout=httpx.Timeout(
            settings.CEREBRAS_TIMEOUT_SECONDS,
            connect=settings.CEREBRAS_CONNECT_TIMEOUT_SECONDS,
            read=settings.CEREBRAS_READ_TIMEOUT_SECONDS,
            write=settings.CEREBRAS_WRITE_TIMEOUT_SECONDS,
        ),
        max_retries=settings.CEREBRAS_MAX_RETRIES,
        warm_tcp_connection=settings.CEREBRAS_WARM_TCP_CONNECTION,
    )


@lru_cache(maxsize=8)
def get_accessible_cerebras_models(api_key: str) -> tuple[str, ...]:
    """Fetch models available to the current Cerebras API key."""
    if not api_key:
        return tuple()

    try:
        response = httpx.get(
            "https://api.cerebras.ai/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json().get("data", [])
        model_ids = [
            item["id"]
            for item in data
            if isinstance(item, dict) and isinstance(item.get("id"), str)
        ]
        return tuple(model_ids)
    except Exception:
        return tuple()
