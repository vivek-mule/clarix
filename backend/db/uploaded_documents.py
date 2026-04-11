"""
backend/db/uploaded_documents.py — CRUD helpers for the uploaded_documents table.

Tracks PDF files uploaded by students, along with cached AI-generated
summaries and roadmaps.
"""

from __future__ import annotations

from typing import Optional

from auth.supabase_client import supabase_admin

TABLE = "uploaded_documents"


def create_document(
    student_id: str,
    filename: str,
    namespace: str,
    page_count: int,
    vector_count: int,
    summary: Optional[str] = None,
    roadmap: Optional[dict] = None,
) -> dict:
    """Insert a new uploaded document record."""
    row = {
        "student_id": student_id,
        "filename": filename,
        "namespace": namespace,
        "page_count": page_count,
        "vector_count": vector_count,
        "summary": summary,
        "roadmap": roadmap,
    }
    res = supabase_admin.table(TABLE).insert(row).execute()
    return res.data[0] if res.data else {}


def get_document(doc_id: str) -> Optional[dict]:
    """Fetch a single document by its UUID."""
    res = (
        supabase_admin
        .table(TABLE)
        .select("*")
        .eq("id", doc_id)
        .maybe_single()
        .execute()
    )
    return res.data


def list_documents(student_id: str, limit: int = 50) -> list[dict]:
    """Return documents for a student, newest first."""
    res = (
        supabase_admin
        .table(TABLE)
        .select("*")
        .eq("student_id", student_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


def update_document(doc_id: str, updates: dict) -> Optional[dict]:
    """Partial update — pass only the fields you want to change."""
    res = (
        supabase_admin
        .table(TABLE)
        .update(updates)
        .eq("id", doc_id)
        .execute()
    )
    return res.data[0] if res.data else None
