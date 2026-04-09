"""
Supabase client singleton.
"""

from supabase import create_client, Client
from app.core.config import settings


def get_supabase_client() -> Client:
    """Return a Supabase client using the service-role key (server-side)."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


supabase: Client = get_supabase_client()
