"""
backend/db/quiz_attempts.py — Helper to save quiz attempt records to Supabase.

Called by the agent routes after each feedback agent run to persist the
quiz results for analytics and progress tracking.
"""

from __future__ import annotations

from auth.supabase_client import supabase_admin

TABLE = "quiz_attempts"


def save_quiz_attempt(
    student_id: str,
    module_topic: str,
    score: float,
    questions: list[dict],
    attempt_number: int | None = None,
) -> dict:
    """
    Insert a quiz attempt record into the quiz_attempts table.

    If attempt_number is not provided, it is auto-calculated as
    (previous attempts for this student + topic) + 1.

    Args:
        student_id:      UUID of the student.
        module_topic:    The topic/module the quiz was on.
        score:           Mastery score (0.0 – 1.0).
        questions:       Full question + evaluation JSON (from feedback agent).
        attempt_number:  Explicit attempt number, or None for auto-increment.

    Returns:
        The inserted row as a dict.
    """
    if attempt_number is None:
        attempt_number = _next_attempt_number(student_id, module_topic)

    row = {
        "student_id": student_id,
        "module_topic": module_topic,
        "score": score,
        "questions": questions,
        "attempt_number": attempt_number,
    }

    res = supabase_admin.table(TABLE).insert(row).execute()
    return res.data[0] if res.data else {}


def get_attempts_for_topic(student_id: str, module_topic: str) -> list[dict]:
    """Return all quiz attempts for a student on a specific topic, ordered by attempt."""
    res = (
        supabase_admin
        .table(TABLE)
        .select("*")
        .eq("student_id", student_id)
        .eq("module_topic", module_topic)
        .order("attempt_number", desc=False)
        .execute()
    )
    return res.data or []


def get_latest_attempt(student_id: str, module_topic: str) -> dict | None:
    """Return the most recent quiz attempt for a student on a topic."""
    res = (
        supabase_admin
        .table(TABLE)
        .select("*")
        .eq("student_id", student_id)
        .eq("module_topic", module_topic)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    return res.data


def get_all_attempts(student_id: str) -> list[dict]:
    """Return all quiz attempts for a student across all topics."""
    res = (
        supabase_admin
        .table(TABLE)
        .select("*")
        .eq("student_id", student_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


def _next_attempt_number(student_id: str, module_topic: str) -> int:
    """Calculate the next attempt number for a student + topic pair."""
    existing = get_attempts_for_topic(student_id, module_topic)
    return len(existing) + 1
