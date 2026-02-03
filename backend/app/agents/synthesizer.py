"""
Synthesizer Agent for MindGlass
Streams responses using Cerebras API
"""

from typing import Dict, Any, AsyncGenerator
from cerebras.cloud.sdk import Cerebras

from app.agents.base import LLMAgent
from app.config import settings


class SynthesizerAgent(LLMAgent):
    """
    Synthesizer agent that streams responses from Cerebras API.
    Creates final consensus by integrating all agent perspectives.
    """

    def __init__(self):
        super().__init__(
            agent_id="synthesizer",
            name="Synthesizer",
            description="Creates final consensus answer by integrating all agent perspectives",
            prompt_file="synthesizer.txt",
            model="llama-3.3-70b"
        )
        self.color = "#C1C1C1"
        api_key = settings.CEREBRAS_API_KEY
        if not api_key:
            raise ValueError("CEREBRAS_API_KEY environment variable not set")
        self.client = Cerebras(api_key=api_key)

    async def stream_response(self, query: str, model_override: str = None, use_reasoning: bool = False) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream a response to the given query using Cerebras API.

        Args:
            query: The user's query or message
            model_override: Optional model ID to override the default
            use_reasoning: Whether to enable reasoning_effort for deeper analysis

        Yields:
            Dict containing agent_token messages
        """
        self.set_status("processing")
        model_to_use = model_override or self.model

        try:
            params = {
                "model": model_to_use,
                "messages": [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": query}
                ],
                "stream": True,
                "max_tokens": 800  # Synthesizer needs more tokens
            }
            stream = self.client.chat.completions.create(**params)

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    yield self._create_token_message(token)

            yield self._create_done_message()

        except Exception as e:
            yield self._create_token_message(f"[Error: {str(e)}]")
            yield self._create_done_message()

        finally:
            self.set_status("idle")

    def get_capabilities(self) -> list:
        """Return synthesizer capabilities."""
        return [
            "consensus_building",
            "perspective_integration",
            "summary_synthesis",
            "recommendation_formation"
        ]
