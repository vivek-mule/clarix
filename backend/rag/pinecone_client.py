"""
rag/pinecone_client.py — Pinecone vector DB client with namespace support.

Initialises the Pinecone connection from environment variables and exposes
two functions:

    upsert_vectors(vectors, namespace)   — idempotent upsert
    query_vectors(vector, namespace, top_k) — similarity search

Environment variables consumed (via app.core.config):
    PINECONE_API_KEY
    PINECONE_ENVIRONMENT
    PINECONE_INDEX_NAME
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from pinecone import Pinecone, ServerlessSpec

# ── Allow standalone usage & normal app imports ─────────────
# When imported from FastAPI (backend/app/...) the app package is already
# on sys.path.  When run from scripts or tests we may need to add it.
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from app.core.config import settings  # noqa: E402

# ── Constants ───────────────────────────────────────────────
DIMENSION = 384
METRIC = "cosine"

# ── Client & index singleton ───────────────────────────────
_pc = Pinecone(api_key=settings.pinecone_api_key)


def _get_or_create_index():
    """Return a handle to the Pinecone index, creating it if it doesn't exist."""
    existing_names = [idx.name for idx in _pc.list_indexes()]
    if settings.pinecone_index_name not in existing_names:
        _pc.create_index(
            name=settings.pinecone_index_name,
            dimension=DIMENSION,
            metric=METRIC,
            spec=ServerlessSpec(cloud="aws", region=settings.pinecone_environment),
        )
    return _pc.Index(settings.pinecone_index_name)


_index = _get_or_create_index()


# ── Public API ──────────────────────────────────────────────

def upsert_vectors(
    vectors: list[dict],
    namespace: str = "",
    batch_size: int = 50,
) -> int:
    """
    Upsert vectors into Pinecone.

    Args:
        vectors:    List of dicts, each with keys:
                        id       (str)
                        values   (list[float], 384-dim)
                        metadata (dict, optional)
        namespace:  Pinecone namespace (e.g. the subject name).
        batch_size: Number of vectors per upsert call.

    Returns:
        Total number of vectors upserted.
    """
    upserted = 0
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i : i + batch_size]
        _index.upsert(vectors=batch, namespace=namespace)
        upserted += len(batch)
    return upserted


def query_vectors(
    vector: list[float],
    namespace: str = "",
    top_k: int = 5,
    include_metadata: bool = True,
) -> list[dict]:
    """
    Query the Pinecone index for the most similar vectors.

    Args:
        vector:           The 384-dim query embedding.
        namespace:        Pinecone namespace to search within.
        top_k:            Number of results to return.
        include_metadata: Whether to return stored metadata.

    Returns:
        A list of dicts with keys: id, score, metadata.
    """
    results = _index.query(
        vector=vector,
        top_k=top_k,
        namespace=namespace,
        include_metadata=include_metadata,
    )
    return [
        {
            "id": match.id,
            "score": match.score,
            "metadata": match.metadata if include_metadata else {},
        }
        for match in results.matches
    ]
