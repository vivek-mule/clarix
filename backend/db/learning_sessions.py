"""
backend/db/learning_sessions.py — Persistence helpers for chat/learning sessions.

Stores full AgentState snapshots in Supabase so sessions can be resumed after
server restart and displayed on the dashboard.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from auth.supabase_client import supabase_admin

TABLE = "learning_sessions"


def create_learning_session(
    session_id: str,
    student_id: str,
    title: str,
    state: dict,
) -> dict:
    """Insert a new learning session row."""
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "id": session_id,
        "student_id": student_id,
        "title": title,
        "state": state,
        "status": "active",
        "last_message_at": now,
    }
    res = supabase_admin.table(TABLE).insert(row).execute()
    return res.data[0] if res.data else {}


def get_learning_session(session_id: str) -> Optional[dict]:
    """Return a single session by id."""
    res = (
        supabase_admin
        .table(TABLE)
        .select("*")
        .eq("id", session_id)
        .maybe_single()
        .execute()
    )
    return res.data


def list_learning_sessions(student_id: str, limit: int = 50) -> list[dict]:
    """Return recent sessions for a student, newest first."""
    res = (
        supabase_admin
        .table(TABLE)
        .select("id, title, status, state, created_at, updated_at, last_message_at")
        .eq("student_id", student_id)
        .order("updated_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


def update_learning_session(session_id: str, updates: dict) -> Optional[dict]:
    """Patch a session row and return the updated row."""
    res = (
        supabase_admin
        .table(TABLE)
        .update(updates)
        .eq("id", session_id)
        .execute()
    )
    return res.data[0] if res.data else None


def touch_learning_session(session_id: str) -> Optional[dict]:
    """Bump the last_message_at timestamp for activity tracking."""
    return update_learning_session(
        session_id,
        {"last_message_at": datetime.now(timezone.utc).isoformat()},
    )
