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
        import time

        self.set_status("processing")
        model_to_use = model_override or self.model
        start_time = time.time()
        token_count = 0

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
            final_usage = None
            final_time_info = None

            while True:
                chunk = await loop.run_in_executor(None, get_next_chunk, iterator)
                if chunk is None:
                    break

                # Capture usage and timing data from final chunk
                if hasattr(chunk, 'usage') and chunk.usage:
                    final_usage = chunk.usage
                if hasattr(chunk, 'time_info') and chunk.time_info:
                    final_time_info = chunk.time_info

                if chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    token_count += 1
                    yield self._create_token_message(token)

            # Calculate tokens per second using API's completion_time for accurate measurement
            # The API provides time_info.completion_time which is the actual inference time
            completion_time = None
            if final_time_info and hasattr(final_time_info, 'completion_time'):
                completion_time = final_time_info.completion_time
            
            # Use API's completion_time if available, otherwise fall back to wall clock
            if completion_time and completion_time > 0:
                completion_tokens_count = final_usage.completion_tokens if final_usage else token_count
                tokens_per_second = completion_tokens_count / completion_time
            else:
                elapsed_time = time.time() - start_time
                tokens_per_second = token_count / elapsed_time if elapsed_time > 0 else 0

            # Send metrics message with token usage from final chunk
            prompt_tokens = final_usage.prompt_tokens if final_usage else 0
            completion_tokens = final_usage.completion_tokens if final_usage else token_count
            total_tokens = final_usage.total_tokens if final_usage else token_count

            yield self._create_metrics_message(
                tokens_per_second=tokens_per_second,
                total_tokens=total_tokens,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens
            )

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
