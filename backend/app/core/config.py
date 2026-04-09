"""
Centralised configuration — reads from .env via pydantic-settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Google Gemini ───────────────────────────────────────
    google_api_key: str = ""

    # ── Pinecone ────────────────────────────────────────────
    pinecone_api_key: str = ""
    pinecone_environment: str = "us-east-1"
    pinecone_index_name: str = "adaptive-learning"

    # ── Supabase ────────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # ── Server ──────────────────────────────────────────────
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


settings = Settings()
