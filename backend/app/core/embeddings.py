"""
Local embedding model — Sentence Transformers all-MiniLM-L6-v2.
Produces 384-dimensional vectors. No API key needed.
"""

from sentence_transformers import SentenceTransformer

# The model is downloaded on first run (~80 MB) and cached locally.
_model = SentenceTransformer("all-MiniLM-L6-v2")


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Return a list of 384-dim embeddings for the given texts."""
    return _model.encode(texts, show_progress_bar=False).tolist()


def embed_query(text: str) -> list[float]:
    """Return a single 384-dim embedding for a query string."""
    return _model.encode(text, show_progress_bar=False).tolist()
