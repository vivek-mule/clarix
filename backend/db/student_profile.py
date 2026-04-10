"""
backend/db/student_profile.py — Async-style helpers for the student_profiles table.

All functions use the supabase_admin client (service-role key) so they
bypass RLS.  The caller is responsible for authorisation (the JWT
dependency in the route layer guarantees the student_id is authentic).

Note: supabase-py is synchronous under the hood, but wrapping in plain
functions keeps the interface clean and easy to swap for async later.
"""

from __future__ import annotations

from typing import Optional

from auth.supabase_client import supabase_admin

TABLE = "student_profiles"


# ── Read ────────────────────────────────────────────────────

def get_profile(student_id: str) -> Optional[dict]:
    """
    Fetch a single student profile by its UUID.
    Returns the row as a dict, or None if not found.
    """
    res = (
        supabase_admin
        .table(TABLE)
        .select("*")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    return res.data


def get_progress(student_id: str) -> Optional[dict]:
    """
    Return only the progress-related fields for a student.
    """
    res = (
        supabase_admin
        .table(TABLE)
        .select(
            "current_module_index, "
            "completed_modules, "
            "learning_path, "
            "knowledge_levels, "
            "struggle_topics, "
            "onboarding_complete"
        )
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    return res.data


# ── Create ──────────────────────────────────────────────────

def create_profile(student_id: str, name: str) -> dict:
    """
    Insert a blank student_profiles row for a newly registered user.
    All JSONB/int fields default to their SQL defaults.
    """
    row = {
        "id": student_id,
        "name": name,
    }
    res = supabase_admin.table(TABLE).insert(row).execute()
    return res.data[0] if res.data else {}


# ── Update ──────────────────────────────────────────────────

def update_profile(student_id: str, updates: dict) -> Optional[dict]:
    """
    Partial update — pass only the fields you want to change.
    Returns the updated row.

    Example:
        update_profile(uid, {
            "onboarding_complete": True,
            "learning_style": "visual",
        })
    """
    res = (
        supabase_admin
        .table(TABLE)
        .update(updates)
        .eq("id", student_id)
        .execute()
    )
    return res.data[0] if res.data else None


def mark_onboarding_complete(
    student_id: str,
    learning_style: str,
    knowledge_levels: dict,
    learning_path: list,
) -> Optional[dict]:
    """
    Convenience wrapper called after the onboarding flow finishes.
    Sets the style, initial knowledge map, generated learning path,
    and flips onboarding_complete to True.
    """
    return update_profile(student_id, {
        "onboarding_complete": True,
        "learning_style": learning_style,
        "knowledge_levels": knowledge_levels,
        "learning_path": learning_path,
    })


def advance_module(student_id: str, completed_topic: str) -> Optional[dict]:
    """
    Mark a module as completed and bump current_module_index.
    Appends the topic to completed_modules and increments the index.
    """
    profile = get_profile(student_id)
    if not profile:
        return None

    completed = profile.get("completed_modules", [])
    if completed_topic not in completed:
        completed.append(completed_topic)

    return update_profile(student_id, {
        "completed_modules": completed,
        "current_module_index": profile.get("current_module_index", 0) + 1,
    })
