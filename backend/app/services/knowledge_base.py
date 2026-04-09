"""
Knowledge-base service — ingests content into Pinecone via local embeddings.
"""

from app.core.embeddings import embed_texts
from app.core.pinecone_client import index


def upsert_content(chunks: list[dict]) -> int:
    """
    Embed and upsert content chunks into Pinecone.

    Each chunk dict should have:
        - id:   str
        - text: str
        - metadata: dict  (e.g. topic_id, difficulty)
    """
    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)

    vectors = [
        {
            "id": c["id"],
            "values": emb,
            "metadata": {**c.get("metadata", {}), "text": c["text"]},
        }
        for c, emb in zip(chunks, embeddings)
    ]

    index.upsert(vectors=vectors)
    return len(vectors)


def query_similar(query_text: str, top_k: int = 5) -> list[dict]:
    """Return top-k most similar content chunks for a query."""
    from app.core.embeddings import embed_query

    vector = embed_query(query_text)
    results = index.query(vector=vector, top_k=top_k, include_metadata=True)
    return [
        {"id": m.id, "score": m.score, "metadata": m.metadata}
        for m in results.matches
    ]
