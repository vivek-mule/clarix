"""
backend/config.py — Typed settings loaded from .env via pydantic-settings.

Usage:
    from config import settings
    print(settings.supabase_url)
"""

from __future__ import annotations

import json

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        enable_decoding=False,  # allow comma-separated env strings for list fields
    )

    # ── Google Vertex AI (Gemini LLM) ───────────────────────
    gcp_project_id: str = "vivid-bond-448811-j4"
    gcp_location: str = "us-central1"

    # ── Pinecone (Vector DB) ────────────────────────────────
    pinecone_api_key: str = "pcsk_4835ke_G8u4PyKQdCVfBtGpWyKicHCTcVgn8kYzKSDDRBSpYGYR8NzrHKwXz1n59KhovJB"
    pinecone_environment: str = "us-east-1"
    pinecone_index_name: str = "clarix-index"

    # ── Supabase (Auth + PostgreSQL) ────────────────────────
    supabase_url: str = "https://xtewdevelolmrocgurrx.supabase.co"
    supabase_anon_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0ZXdkZXZlbG9sbXJvY2d1cnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzUxNjMsImV4cCI6MjA5MTMxMTE2M30.05id2P1_F1u4UtuawpMOT9o-l0AA3RTJpATw0oBp8sM"
    supabase_service_role_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0ZXdkZXZlbG9sbXJvY2d1cnJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTczNTE2MywiZXhwIjoyMDkxMzExMTYzfQ.B3sqXy23LXsQNQpJEZwo6WiM93rzLOSwFd3yByNrF84"

    # ── Supabase JWT verification ───────────────────────────
    # Found at Supabase → Project Settings → API → JWT Secret
    supabase_jwt_secret: str = "/7CU61n3m4D5O62QJCuB5pJBAFCpcjUFECZ/oBCVN7J2xiTSFuLtjkaq3Zl11ugk6betdQ83DAOVkdOL5k9BfQ=="

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
