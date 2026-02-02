"""
Tests for the Blackboard shared context system
"""

import pytest
from app.orchestrator.blackboard import Blackboard, BlackboardEntry


class TestBlackboardEntry:
    """Test BlackboardEntry dataclass"""

    def test_entry_creation(self):
        """AC #1: Entry stores agent_id, content, timestamp"""
        entry = BlackboardEntry(
            agent_id="analyst",
            content="This is a test thought.",
            timestamp=1234567890.0
        )

        assert entry.agent_id == "analyst"
        assert entry.content == "This is a test thought."
        assert entry.timestamp == 1234567890.0
        assert entry.is_user_constraint is False

    def test_user_constraint_entry(self):
        """AC #5: User constraint entries are marked specially"""
        entry = BlackboardEntry(
            agent_id="user",
            content="Focus on B2B only",
            timestamp=1234567890.0,
            is_user_constraint=True
        )

        assert entry.is_user_constraint is True

    def test_to_prompt_string_agent(self):
        """AC #4: Agent entries formatted with name and content"""
        entry = BlackboardEntry(
            agent_id="analyst",
            content="Market analysis complete.",
            timestamp=1234567890.0
        )

        result = entry.to_prompt_string()
        assert result == "[ANALYST]: Market analysis complete."

    def test_to_prompt_string_user_constraint(self):
        """AC #5: User constraints formatted prominently"""
        entry = BlackboardEntry(
            agent_id="user",
            content="Focus on B2B opportunities",
            timestamp=1234567890.0,
            is_user_constraint=True
        )

        result = entry.to_prompt_string()
        assert result == "[USER CONSTRAINT]: Focus on B2B opportunities"


class TestBlackboard:
    """Test Blackboard class functionality"""

    def test_initialization(self):
        """Blackboard initializes empty with default max_tokens"""
        bb = Blackboard()

        assert bb.entries == []
        assert bb.pending_tokens == {}
        assert bb.max_tokens == 2000

    def test_initialization_custom_max_tokens(self):
        """Blackboard can be initialized with custom max_tokens"""
        bb = Blackboard(max_tokens=1000)

        assert bb.max_tokens == 1000

    def test_append_adds_entry(self):
        """AC #1: append() adds entry to blackboard"""
        bb = Blackboard()

        bb.append("analyst", "This is a complete thought.")

        assert len(bb.entries) == 1
        assert bb.entries[0].agent_id == "analyst"
        assert bb.entries[0].content == "This is a complete thought."

    def test_append_strips_whitespace(self):
        """append() strips whitespace from content"""
        bb = Blackboard()

        bb.append("analyst", "  Whitespace content  ")

        assert bb.entries[0].content == "Whitespace content"

    def test_add_token_accumulates(self):
        """AC #1: add_token() accumulates tokens for an agent"""
        bb = Blackboard()

        bb.add_token("analyst", "Hello")
        bb.add_token("analyst", " world")

        assert bb.pending_tokens["analyst"] == "Hello world"
        assert len(bb.entries) == 0  # No entry yet (no boundary)

    def test_add_token_detects_period_boundary(self):
        """AC #1: add_token() detects period as thought boundary"""
        bb = Blackboard()

        bb.add_token("analyst", "First sentence. Second")

        assert len(bb.entries) == 1
        assert bb.entries[0].content == "First sentence."
        assert bb.pending_tokens["analyst"] == "Second"

    def test_add_token_detects_question_boundary(self):
        """AC #1: add_token() detects question mark as boundary"""
        bb = Blackboard()

        bb.add_token("analyst", "What is this? More text")

        assert len(bb.entries) == 1
        assert bb.entries[0].content == "What is this?"

    def test_add_token_detects_exclamation_boundary(self):
        """AC #1: add_token() detects exclamation as boundary"""
        bb = Blackboard()

        bb.add_token("analyst", "This is amazing! More to come")

        assert len(bb.entries) == 1
        assert bb.entries[0].content == "This is amazing!"

    def test_add_token_detects_newline_boundary(self):
        """AC #1: add_token() detects newline after punctuation as boundary"""
        bb = Blackboard()

        bb.add_token("analyst", "This is line one.\nLine two")

        assert len(bb.entries) == 1
        assert bb.entries[0].content == "This is line one."

    def test_add_token_avoids_tiny_fragments(self):
        """AC #1: add_token() avoids tiny fragments under 10 chars"""
        bb = Blackboard()

        bb.add_token("analyst", "Hi. There")

        # "Hi." is only 3 chars, should not be added
        assert len(bb.entries) == 0
        # The tiny fragment gets kept in pending with the remainder
        assert "Hi." in bb.pending_tokens["analyst"]
        assert "There" in bb.pending_tokens["analyst"]

    def test_add_token_multiple_boundaries(self):
        """AC #1: add_token() handles multiple sentences over multiple calls"""
        bb = Blackboard()

        bb.add_token("analyst", "This is the first sentence here.")
        assert len(bb.entries) == 1

        bb.add_token("analyst", " This is the second sentence.")
        assert len(bb.entries) == 2

    def test_flush_pending_completes_thought(self):
        """AC #1: flush_pending() adds remaining text as entry"""
        bb = Blackboard()

        bb.add_token("analyst", "Incomplete thought")
        assert len(bb.entries) == 0

        bb.flush_pending("analyst")

        assert len(bb.entries) == 1
        assert bb.entries[0].content == "Incomplete thought"
        assert bb.pending_tokens["analyst"] == ""

    def test_flush_pending_empty(self):
        """flush_pending() handles empty pending tokens"""
        bb = Blackboard()

        bb.flush_pending("analyst")  # No pending tokens

        assert len(bb.entries) == 0

    def test_flush_pending_whitespace_only(self):
        """flush_pending() ignores whitespace-only pending tokens"""
        bb = Blackboard()

        bb.pending_tokens["analyst"] = "   \n\t  "
        bb.flush_pending("analyst")

        assert len(bb.entries) == 0

    def test_get_context_empty(self):
        """AC #2: get_context() returns empty string when no entries"""
        bb = Blackboard()

        result = bb.get_context()

        assert result == ""

    def test_get_context_with_entries(self):
        """AC #2, #4: get_context() returns formatted context with agent names"""
        bb = Blackboard()

        bb.append("analyst", "First analysis point.")
        bb.append("critic", "Counter argument here.")

        result = bb.get_context()

        assert "Previous debate contributions:" in result
        assert "[ANALYST]: First analysis point." in result
        assert "[CRITIC]: Counter argument here." in result

    def test_get_context_excludes_agent(self):
        """AC #2: get_context() can exclude specific agent"""
        bb = Blackboard()

        bb.append("analyst", "Analyst thought.")
        bb.append("critic", "Critic response.")

        result = bb.get_context(exclude_agent="analyst")

        assert "Analyst thought" not in result
        assert "Critic response" in result

    def test_get_context_with_user_constraint(self):
        """AC #5: User constraints appear in context"""
        bb = Blackboard()

        bb.append("analyst", "Analysis here.")
        bb.append("user", "Focus on B2B", is_user_constraint=True)

        result = bb.get_context()

        assert "[USER CONSTRAINT]: Focus on B2B" in result

    def test_truncate_removes_oldest(self):
        """AC #3: Truncation removes oldest entries when over limit"""
        bb = Blackboard(max_tokens=50)  # Very small limit for testing

        # Add entries that will exceed token limit
        bb.append("analyst", "This is a very long first entry with many words.")
        bb.append("critic", "Second entry also has many words here.")
        bb.append("optimist", "Third entry with sufficient words.")

        # Should have truncated oldest entries
        total_tokens = bb.get_token_count()
        assert total_tokens <= 50

    def test_truncate_keeps_user_constraints(self):
        """AC #3, #5: User constraints are never truncated"""
        bb = Blackboard(max_tokens=30)  # Very small limit

        bb.append("analyst", "First analyst entry with many words.")
        bb.append("user", "Important constraint", is_user_constraint=True)
        bb.append("critic", "Critic entry with many words here.")

        user_entries = bb.get_user_constraints()
        assert len(user_entries) == 1
        assert user_entries[0].content == "Important constraint"

    def test_clear_empties_blackboard(self):
        """clear() removes all entries and pending tokens"""
        bb = Blackboard()

        bb.append("analyst", "Entry one.")
        bb.add_token("critic", "Pending")
        bb.clear()

        assert bb.entries == []
        assert bb.pending_tokens == {}

    def test_get_token_count(self):
        """AC #3: Token count is estimated correctly"""
        bb = Blackboard()

        bb.append("analyst", "This has five words here")

        # 5 words * 1.3 = 6.5 -> 7 tokens (rounded)
        assert bb.get_token_count() == 7

    def test_len_returns_entry_count(self):
        """__len__ returns number of entries"""
        bb = Blackboard()

        assert len(bb) == 0

        bb.append("analyst", "Entry one.")
        assert len(bb) == 1

        bb.append("critic", "Entry two.")
        assert len(bb) == 2

    def test_multiple_agents_separate_pending(self):
        """Each agent has separate pending tokens"""
        bb = Blackboard()

        bb.add_token("analyst", "Analyst text")
        bb.add_token("critic", "Critic text")

        assert bb.pending_tokens["analyst"] == "Analyst text"
        assert bb.pending_tokens["critic"] == "Critic text"

    def test_get_entries_for_agent(self):
        """get_entries_for_agent returns only that agent's entries"""
        bb = Blackboard()

        bb.append("analyst", "Analyst one.")
        bb.append("critic", "Critic one.")
        bb.append("analyst", "Analyst two.")

        analyst_entries = bb.get_entries_for_agent("analyst")

        assert len(analyst_entries) == 2
        assert all(e.agent_id == "analyst" for e in analyst_entries)

    def test_truncate_maintains_order(self):
        """AC #3: After truncation, entries remain in chronological order"""
        bb = Blackboard(max_tokens=40)

        bb.append("analyst", "First entry with enough words.")
        import time
        time.sleep(0.01)  # Ensure different timestamps
        bb.append("critic", "Second entry with enough words.")
        time.sleep(0.01)
        bb.append("optimist", "Third entry with enough words.")

        # Check order is maintained
        timestamps = [e.timestamp for e in bb.entries]
        assert timestamps == sorted(timestamps)
