"""
agents/llm.py — Shared Gemini 2.5 Pro instance via Google Vertex AI.

Uses langchain-google-vertexai so all agents share a single LLM client.
Authentication: Application Default Credentials (ADC).
    Run once:  gcloud auth application-default login
"""

from __future__ import annotations

from langchain_google_vertexai import ChatVertexAI
from config import settings

llm = ChatVertexAI(
    model="gemini-2.5-pro",
    project=settings.gcp_project_id,
    location=settings.gcp_location,
    temperature=0.4,
    max_output_tokens=8192,
    streaming=True,
)
