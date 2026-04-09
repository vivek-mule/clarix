"""
Learner-model service — tracks knowledge state in Supabase.
"""

from app.core.supabase_client import supabase


def get_learner_profile(user_id: str) -> dict | None:
    """Fetch the learner profile from Supabase."""
    res = supabase.table("learner_profiles").select("*").eq("id", user_id).execute()
    return res.data[0] if res.data else None


def upsert_learner_profile(profile: dict) -> dict:
    """Create or update a learner profile."""
    res = supabase.table("learner_profiles").upsert(profile).execute()
    return res.data[0] if res.data else {}


def record_quiz_result(result: dict) -> dict:
    """Insert a quiz result and update the learner model."""
    res = supabase.table("quiz_results").insert(result).execute()
    return res.data[0] if res.data else {}
