"""
rag/embedder.py — Singleton local embedding model.

Loads all-MiniLM-L6-v2 ONCE at module import time (~80 MB download on first
run, then cached).  Every subsequent call to get_embedding() reuses the same
model instance — zero overhead per request.

    from rag.embedder import get_embedding
    vec = get_embedding("What is Newton's second law?")   # list[float], len=384
"""

from sentence_transformers import SentenceTransformer

# ── Singleton model ─────────────────────────────────────────
# Loaded once when this module is first imported.
# Thread-safe for read-only .encode() calls.
_model: SentenceTransformer = SentenceTransformer("all-MiniLM-L6-v2")

EMBEDDING_DIM = 384


def get_embedding(text: str) -> list[float]:
    """
    Return a 384-dimensional embedding vector for the given text.

    Args:
        text: The input string to embed.

    Returns:
        A list of 384 floats.
    """
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIM

    vector = _model.encode(text, show_progress_bar=False)
    return vector.tolist()


def get_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Batch-embed multiple texts in a single forward pass (faster than
    calling get_embedding in a loop).

    Args:
        texts: A list of input strings.

    Returns:
        A list of 384-dim float vectors, one per input text.
    """
    if not texts:
        return []

    vectors = _model.encode(texts, show_progress_bar=False)
    return vectors.tolist()
