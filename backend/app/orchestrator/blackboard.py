"""
Blackboard Shared Context for MindGlass Multi-Agent Debate

Manages shared context between agents, allowing them to see and respond
to each other's contributions during the debate.
"""

from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime


@dataclass
class BlackboardEntry:
    """A single entry in the blackboard."""
    agent_id: str
    content: str
    timestamp: float
    is_user_constraint: bool = False

    def to_prompt_string(self) -> str:
        """Format entry for inclusion in agent prompts."""
        if self.is_user_constraint:
            return f"[USER CONSTRAINT]: {self.content}"
        return f"[{self.agent_id.upper()}]: {self.content}"


class Blackboard:
    """
    Shared context blackboard for multi-agent debate.

    Accumulates agent contributions and provides formatted context
    for agent prompts. Handles token limiting and truncation.
    """

    def __init__(self, max_tokens: int = 2000):
        self.entries: List[BlackboardEntry] = []
        self.max_tokens = max_tokens
        self.pending_tokens: dict[str, str] = {}  # agent_id -> accumulated text

    def append(self, agent_id: str, content: str, is_user_constraint: bool = False):
        """Add a completed thought to the blackboard."""
        entry = BlackboardEntry(
            agent_id=agent_id,
            content=content.strip(),
            timestamp=datetime.now().timestamp(),
            is_user_constraint=is_user_constraint
        )
        self.entries.append(entry)
        self._truncate_if_needed()

    def add_token(self, agent_id: str, token: str):
        """
        Accumulate tokens and detect thought boundaries.

        Thought boundaries are: ., ?, ! followed by space or newline.
        When a boundary is detected, the completed thought is added to the blackboard.
        """
        if agent_id not in self.pending_tokens:
            self.pending_tokens[agent_id] = ""

        self.pending_tokens[agent_id] += token

        # Check for thought boundary (longer boundaries first to avoid partial matches)
        text = self.pending_tokens[agent_id]
        # Boundaries: punctuation followed by space/newline, or at end of string
        boundaries = ['. ', '? ', '! ', '.\n', '?\n', '!\n']

        for boundary in boundaries:
            if boundary in text:
                parts = text.split(boundary, 1)
                thought = parts[0] + boundary.strip()
                remainder = parts[1] if len(parts) > 1 else ""

                # Append completed thought (avoid tiny fragments)
                if len(thought.strip()) > 10:
                    self.append(agent_id, thought)
                else:
                    # Keep tiny fragments in remainder
                    remainder = thought + (remainder if remainder else "")

                self.pending_tokens[agent_id] = remainder
                break
        else:
            # No boundary with space/newline found; check for terminal punctuation at end
            if text.rstrip().endswith(('.', '?', '!')):
                # Only process if it's a complete thought (ends with punctuation)
                # and is long enough to be meaningful
                thought = text.rstrip()
                if len(thought) > 10:
                    self.append(agent_id, thought)
                    self.pending_tokens[agent_id] = ""

    def flush_pending(self, agent_id: str):
        """Flush any remaining pending tokens for an agent."""
        if agent_id in self.pending_tokens and self.pending_tokens[agent_id].strip():
            self.append(agent_id, self.pending_tokens[agent_id])
            self.pending_tokens[agent_id] = ""

    def get_context(self, exclude_agent: Optional[str] = None) -> str:
        """
        Get formatted context string for agent prompts.

        Args:
            exclude_agent: Optional agent_id to exclude from context (agent's own contributions)

        Returns:
            Formatted context string or empty string if no entries
        """
        if not self.entries:
            return ""

        lines = ["Previous debate contributions:"]
        for entry in self.entries:
            if exclude_agent and entry.agent_id == exclude_agent:
                continue
            lines.append(entry.to_prompt_string())

        return "\n".join(lines)

    def get_entries_for_agent(self, agent_id: str) -> List[BlackboardEntry]:
        """Get all entries from a specific agent."""
        return [e for e in self.entries if e.agent_id == agent_id]

    def get_user_constraints(self) -> List[BlackboardEntry]:
        """Get all user constraint entries."""
        return [e for e in self.entries if e.is_user_constraint]

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count (rough: words * 1.3)."""
        return int(len(text.split()) * 1.3 + 0.5)  # Round to nearest int

    def _truncate_if_needed(self):
        """Remove oldest entries if over token limit. User constraints are never truncated."""
        # Separate user constraints from agent entries
        user_entries = [e for e in self.entries if e.is_user_constraint]
        agent_entries = [e for e in self.entries if not e.is_user_constraint]

        total_text = " ".join(e.content for e in self.entries)
        current_tokens = self._estimate_tokens(total_text)

        # Remove oldest agent entries until under limit
        while current_tokens > self.max_tokens and agent_entries:
            agent_entries.pop(0)
            total_text = " ".join(e.content for e in agent_entries + user_entries)
            current_tokens = self._estimate_tokens(total_text)

        # Recombine and sort by timestamp
        self.entries = sorted(
            agent_entries + user_entries,
            key=lambda e: e.timestamp
        )

    def clear(self):
        """Clear the blackboard for a new debate."""
        self.entries = []
        self.pending_tokens = {}

    def get_token_count(self) -> int:
        """Get estimated token count of all entries."""
        total_text = " ".join(e.content for e in self.entries)
        return self._estimate_tokens(total_text)

    def __len__(self) -> int:
        """Return number of entries."""
        return len(self.entries)
