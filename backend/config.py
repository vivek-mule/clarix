"""
backend/config.py — Typed settings loaded from .env via pydantic-settings.

Usage:
    from config import settings
    print(settings.supabase_url)
"""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parent
ENV_FILES = (str(BACKEND_DIR / ".env"), ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
        enable_decoding=False,  # allow comma-separated env strings for list fields
    )

    # ── Google Vertex AI (Gemini LLM) ───────────────────────
    gcp_project_id: str = Field(...)
    gcp_location: str = Field(...)

    # ── Pinecone (Vector DB) ────────────────────────────────
    pinecone_api_key: str = Field(...)
    pinecone_environment: str = Field(...)
    pinecone_index_name: str = Field(...)
    rag_top_k: int = 8
    quiz_rag_top_k: int = 8

    # ── Supabase (Auth + PostgreSQL) ────────────────────────
    supabase_url: str = Field(...)
    supabase_anon_key: str = Field(...)
    supabase_service_role_key: str = Field(...)

    # ── Supabase JWT verification ───────────────────────────
    # Found at Supabase → Project Settings → API → JWT Secret
    supabase_jwt_secret: str = Field(...)

    # ── Server ──────────────────────────────────────────────
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v):
        """
        Accept either:
          - JSON array string: '["http://localhost:5173"]'
          - comma-separated string: 'http://localhost:5173,http://127.0.0.1:5173'
          - list[str]
        """
        if v is None:
            return []
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return []
            if s.startswith("["):
                try:
                    arr = json.loads(s)
                    if isinstance(arr, list):
                        return [str(x).strip() for x in arr if str(x).strip()]
                except Exception:
                    # fall back to comma-split
                    pass
            return [part.strip() for part in s.split(",") if part.strip()]
        return v


settings = Settings()
