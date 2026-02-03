from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, AsyncGenerator
from datetime import datetime
import os

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
    async def stream_response(self, query: str, model_override: str = None) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream a response to the given query.

        Args:
            query: The user's query or message
            model_override: Optional model ID to use instead of the default

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
