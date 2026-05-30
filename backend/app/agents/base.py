from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, AsyncGenerator
from datetime import datetime
import os
import json
import time

import httpx


class BaseAgent(ABC):
    """
    Abstract base class for all agents in the MindGlass system.
    """

    def __init__(self, agent_id: str, name: str, description: str = "", prompt_file: str = ""):
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.created_at = datetime.now().isoformat()
        self.status = "idle"
        self.metadata: Dict[str, Any] = {}
        self.system_prompt = self._load_prompt(prompt_file) if prompt_file else ""

    def _load_prompt(self, prompt_file: str) -> str:
        """Load system prompt from file."""
        try:
            # Look in prompts directory relative to this file
            prompts_dir = os.path.join(os.path.dirname(__file__), "prompts")
            full_path = os.path.join(prompts_dir, prompt_file)
            with open(full_path, 'r') as f:
                return f.read()
        except FileNotFoundError:
            raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
        except Exception as e:
            raise RuntimeError(f"Error loading prompt file {prompt_file}: {e}")

    def _create_token_message(self, content: str) -> Dict[str, Any]:
        """Create a standardized agent token message."""
        return {
            "type": "agent_token",
            "agentId": self.agent_id,
            "content": content,
            "timestamp": int(datetime.now().timestamp() * 1000)
        }

    def _create_metrics_message(
        self,
        tokens_per_second: float,
        total_tokens: int,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        completion_time: float = 0,
    ) -> Dict[str, Any]:
        """Create a standardized agent metrics message with token usage."""
        return {
            "type": "agent_metrics",
            "agentId": self.agent_id,
            "tokensPerSecond": tokens_per_second,
            "totalTokens": total_tokens,
            "promptTokens": prompt_tokens,
            "completionTokens": completion_tokens,
            "completionTime": completion_time,
            "timestamp": int(datetime.now().timestamp() * 1000)
        }

    def _create_done_message(self) -> Dict[str, Any]:
        """Create a standardized agent done message to signal end of stream."""
        return {
            "type": "agent_done",
            "agentId": self.agent_id,
            "timestamp": int(datetime.now().timestamp() * 1000)
        }

    @abstractmethod
    async def process(self, input_data: Any) -> Dict[str, Any]:
        """
        Process input data and return results.
        Must be implemented by concrete agent classes.
        """
        pass

    @abstractmethod
    def get_capabilities(self) -> List[str]:
        """
        Return list of agent capabilities.
        Must be implemented by concrete agent classes.
        """
        pass

    def to_dict(self) -> Dict[str, Any]:
        """Convert agent to dictionary representation."""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at,
            "status": self.status,
            "capabilities": self.get_capabilities(),
            "metadata": self.metadata
        }

    def update_metadata(self, key: str, value: Any) -> None:
        """Update agent metadata."""
        self.metadata[key] = value

    def set_status(self, status: str) -> None:
        """Update agent status."""
        self.status = status

    @abstractmethod
    async def stream_response(
        self,
        query: str,
        model_override: str = None,
        use_reasoning: bool = False,
        max_completion_tokens: int | None = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream a response to the given query.

        Args:
            query: The user's query or message
            model_override: Optional model ID to use instead of the default
            use_reasoning: Whether to enable reasoning_effort for deeper analysis
            max_completion_tokens: Optional cap for latency-sensitive responses

        Yields:
            Dict containing agent_token messages with:
            - type: "agent_token"
            - agentId: str
            - content: str
            - timestamp: int (Unix ms)
        """
        pass


class LLMAgent(BaseAgent):
    """
    Base class for LLM-powered agents using Cerebras API.
    """

    def __init__(self, agent_id: str, name: str, description: str = "",
                 model: str = "llama3.1-8b", prompt_file: str = ""):
        super().__init__(agent_id, name, description, prompt_file)
        self.model = model
        self.conversation_history: List[Dict[str, str]] = []

    async def process(self, input_data: Any) -> Dict[str, Any]:
        """Process input using LLM."""
        # TODO: Implement Cerebras API integration
        self.set_status("processing")

        try:
            # Placeholder for actual LLM call
            result = {
                "agent_id": self.agent_id,
                "model": self.model,
                "input": input_data,
                "output": "LLM response placeholder",
                "timestamp": datetime.now().isoformat()
            }

            self.conversation_history.append({
                "role": "user",
                "content": str(input_data)
            })
            self.conversation_history.append({
                "role": "assistant",
                "content": result["output"]
            })

            return result

        finally:
            self.set_status("idle")

    def get_capabilities(self) -> List[str]:
        return ["text_generation", "conversation", "analysis"]

    def clear_history(self) -> None:
        """Clear conversation history."""
        self.conversation_history = []

    async def _stream_openrouter_response(
        self,
        query: str,
        model: str,
        max_completion_tokens: int | None = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream an OpenRouter completion using its OpenAI-compatible SSE API."""
        from app.config import settings

        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY environment variable not set")

        start_time = time.time()
        token_count = 0
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": query},
            ],
            "stream": True,
        }
        requested_max_tokens = max_completion_tokens or settings.OPENROUTER_MIN_MAX_TOKENS
        payload["max_tokens"] = max(requested_max_tokens, settings.OPENROUTER_MIN_MAX_TOKENS)
        if settings.OPENROUTER_PROVIDER_SORT:
            payload["provider"] = {
                "sort": settings.OPENROUTER_PROVIDER_SORT,
            }

        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.OPENROUTER_HTTP_REFERER,
            "X-OpenRouter-Title": settings.OPENROUTER_APP_TITLE,
        }

        timeout = httpx.Timeout(
            settings.CEREBRAS_TIMEOUT_SECONDS,
            connect=settings.CEREBRAS_CONNECT_TIMEOUT_SECONDS,
            read=settings.CEREBRAS_READ_TIMEOUT_SECONDS,
            write=settings.CEREBRAS_WRITE_TIMEOUT_SECONDS,
        )

        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            ) as response:
                response.raise_for_status()
                reasoning_open = False

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue

                    data = line[6:].strip()
                    if data == "[DONE]":
                        break

                    chunk = json.loads(data)
                    choice = (chunk.get("choices") or [{}])[0]
                    delta = choice.get("delta") or {}
                    reasoning = delta.get("reasoning")
                    if isinstance(reasoning, str) and reasoning:
                        if not reasoning_open:
                            token_count += 1
                            yield self._create_token_message("<think>")
                            reasoning_open = True
                        token_count += 1
                        yield self._create_token_message(reasoning)

                    content = delta.get("content")
                    if isinstance(content, str) and content:
                        if reasoning_open:
                            token_count += 1
                            yield self._create_token_message("</think>")
                            reasoning_open = False
                        token_count += 1
                        yield self._create_token_message(content)

                    usage = chunk.get("usage") or {}
                    prompt_tokens = usage.get("prompt_tokens", prompt_tokens)
                    completion_tokens = usage.get("completion_tokens", completion_tokens)
                    total_tokens = usage.get("total_tokens", total_tokens)

                if reasoning_open:
                    token_count += 1
                    yield self._create_token_message("</think>")

        elapsed = time.time() - start_time
        effective_completion_tokens = completion_tokens or token_count
        tokens_per_second = effective_completion_tokens / elapsed if elapsed > 0 else 0

        yield self._create_metrics_message(
            tokens_per_second=tokens_per_second,
            total_tokens=total_tokens or effective_completion_tokens,
            prompt_tokens=prompt_tokens,
            completion_tokens=effective_completion_tokens,
            completion_time=elapsed,
        )
        yield self._create_done_message()
