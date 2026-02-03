"""
Analyst Agent for MindGlass
Streams responses using Cerebras API
"""

from typing import Dict, Any, AsyncGenerator
from cerebras.cloud.sdk import Cerebras

from app.agents.base import LLMAgent
from app.config import settings


class AnalystAgent(LLMAgent):
    """
    Analyst agent that streams responses from Cerebras API.
    Uses the llama-3.3-70b model for analysis.
    """

    def __init__(self):
        super().__init__(
            agent_id="analyst",
            name="Analyst",
            description="Breaks down complex problems and provides structured analysis",
            prompt_file="analyst.txt",
            model="llama-3.3-70b"
        )
        self.color = "#5F8787"
        # Initialize Cerebras client using centralized config
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
        import asyncio
        
        self.set_status("processing")
        model_to_use = model_override or self.model

        try:
            # Build completion params
            params = {
                "model": model_to_use,
                "messages": [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": query}
                ],
                "stream": True
            }
            
            # Create streaming completion
            stream = self.client.chat.completions.create(**params)

            # Stream tokens to client - use run_in_executor to not block event loop
            # The Cerebras SDK returns a sync iterator, so we need to iterate in a thread
            loop = asyncio.get_event_loop()
            
            def get_next_chunk(iterator):
                try:
                    return next(iterator)
                except StopIteration:
                    return None
            
            iterator = iter(stream)
            while True:
                chunk = await loop.run_in_executor(None, get_next_chunk, iterator)
                if chunk is None:
                    break
                if chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    yield self._create_token_message(token)

            # Signal completion
            yield self._create_done_message()

        except Exception as e:
            # Yield error as token
            yield self._create_token_message(f"[Error: {str(e)}]")
            yield self._create_done_message()

        finally:
            self.set_status("idle")

    def get_capabilities(self) -> list:
        """Return analyst capabilities."""
        return [
            "problem_breakdown",
            "factual_analysis",
            "structured_reasoning",
            "multi_agent_debate"
        ]
