"""
backend/auth/supabase_client.py — Two Supabase client singletons.

    supabase_auth   → uses the ANON key   (for auth operations: signup, login)
    supabase_admin  → uses the SERVICE ROLE key (for server-side DB reads/writes,
                      bypasses RLS)

Usage:
    from auth.supabase_client import supabase_auth, supabase_admin
"""

from __future__ import annotations

from supabase import create_client, Client

from config import settings

# ── Auth client (anon key) ──────────────────────────────────
# Used for sign-up, sign-in, and other auth flows.
# This client respects RLS policies.
supabase_auth: Client = create_client(
    settings.supabase_url,
    settings.supabase_anon_key,
)

# ── Admin client (service-role key) ─────────────────────────
# Used for server-side DB operations (profile creation, progress
# updates, etc.).  Bypasses RLS — NEVER expose this client to the
# frontend.
supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)
