"""
Risk Agent for MindGlass
Streams responses using Cerebras API
"""

from typing import Dict, Any, AsyncGenerator
from cerebras.cloud.sdk import Cerebras

from app.agents.base import LLMAgent
from app.config import settings


class RiskAgent(LLMAgent):
    """
    Risk agent that streams responses from Cerebras API.
    Assesses legal, safety, compliance, and operational risks.
    """

    def __init__(self, api_key: str | None = None):
        super().__init__(
            agent_id="risk",
            name="Risk",
            description="Assesses legal, safety, compliance, and operational risks",
            prompt_file="risk.txt",
            model="llama-3.3-70b"
        )
        self.color = "#B91C1C"
        resolved_key = api_key or settings.CEREBRAS_API_KEY
        if not resolved_key:
            raise ValueError("CEREBRAS_API_KEY environment variable not set")
        self.client = Cerebras(api_key=resolved_key)

    async def stream_response(self, query: str, model_override: str = None, use_reasoning: bool = False) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream a response to the given query using Cerebras API.
        """
        import asyncio
        import time

        self.set_status("processing")
        model_to_use = model_override or self.model
        start_time = time.time()
        token_count = 0

        try:
            params = {
                "model": model_to_use,
                "messages": [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": query}
                ],
                "stream": True
            }
            stream = self.client.chat.completions.create(**params)

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
            completion_time = None
            if final_time_info and hasattr(final_time_info, 'completion_time'):
                completion_time = final_time_info.completion_time
            
            elapsed_time = None
            if completion_time and completion_time > 0:
                completion_tokens_count = final_usage.completion_tokens if final_usage else token_count
                tokens_per_second = completion_tokens_count / completion_time
            else:
                elapsed_time = time.time() - start_time
                tokens_per_second = token_count / elapsed_time if elapsed_time > 0 else 0

            metrics_time = completion_time if completion_time and completion_time > 0 else (elapsed_time or 0)

            # Send metrics message with token usage from final chunk
            prompt_tokens = final_usage.prompt_tokens if final_usage else 0
            completion_tokens = final_usage.completion_tokens if final_usage else token_count
            total_tokens = final_usage.total_tokens if final_usage else token_count

            yield self._create_metrics_message(
                tokens_per_second=tokens_per_second,
                total_tokens=total_tokens,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                completion_time=metrics_time,
            )

            yield self._create_done_message()

        except Exception as e:
            yield self._create_token_message(f"[Error: {str(e)}]")
            yield self._create_done_message()

        finally:
            self.set_status("idle")

    def get_capabilities(self) -> list:
        """Return risk capabilities."""
        return [
            "risk_assessment",
            "compliance_analysis",
            "safety_evaluation",
            "operational_risk_management"
        ]
