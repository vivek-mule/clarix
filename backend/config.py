"""
backend/config.py — Typed settings loaded from .env via pydantic-settings.

Usage:
    from config import settings
    print(settings.supabase_url)
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Google Vertex AI (Gemini LLM) ───────────────────────
    gcp_project_id: str = ""
    gcp_location: str = "us-central1"

    # ── Pinecone (Vector DB) ────────────────────────────────
    pinecone_api_key: str = ""
    pinecone_environment: str = "us-east-1"
    pinecone_index_name: str = "adaptive-learning"

    # ── Supabase (Auth + PostgreSQL) ────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # ── Supabase JWT verification ───────────────────────────
    # Found at Supabase → Project Settings → API → JWT Secret
    supabase_jwt_secret: str = ""

    # ── Server ──────────────────────────────────────────────
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


settings = Settings()
