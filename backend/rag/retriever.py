"""
rag/retriever.py — High-level RAG retrieval function.

Ties together the embedder and Pinecone client into a single call:

    from rag.retriever import retrieve_chunks

    chunks = retrieve_chunks(
        query="Explain Newton's second law",
        namespace="physics",
        top_k=5,
    )
    # chunks → ["Force equals mass times acceleration …", …]
"""

from __future__ import annotations

from rag.embedder import get_embedding
from rag.pinecone_client import query_vectors


def retrieve_chunks(
    query: str,
    namespace: str,
    top_k: int = 5,
) -> list[str]:
    """
    Embed a query, search Pinecone, and return the text content of the
    top-k most relevant chunks.

    Args:
        query:     The user's natural-language question.
        namespace: Pinecone namespace to search (= subject name).
        top_k:     Maximum number of chunks to return.

    Returns:
        A list of plain-text strings extracted from the matching vectors'
        metadata["text"] field.  Results are ordered by descending
        similarity score.  If a match has no text metadata it is silently
        skipped.
    """
    # 1. Embed the query locally (384-dim, no API call)
    query_vector = get_embedding(query)

    # 2. Similarity search in Pinecone
    matches = query_vectors(
        vector=query_vector,
        namespace=namespace,
        top_k=top_k,
        include_metadata=True,
    )

    # 3. Extract the text payload from each match
    chunks: list[str] = []
    for match in matches:
        text = match.get("metadata", {}).get("text", "")
        if text:
            chunks.append(text)

    return chunks


def retrieve_chunks_with_metadata(
    query: str,
    namespace: str,
    top_k: int = 5,
) -> list[dict]:
    """
    Same as retrieve_chunks but returns the full metadata dict alongside
    each chunk — useful when the caller needs source filename, slide
    number, difficulty, etc.

    Returns:
        A list of dicts:
            {
                "text":  str,
                "score": float,
                "id":    str,
                "source": str,
                "slide":  int,
                "topic":  str,
                "difficulty": str,
                ...
            }
    """
    query_vector = get_embedding(query)

    matches = query_vectors(
        vector=query_vector,
        namespace=namespace,
        top_k=top_k,
        include_metadata=True,
    )

    results: list[dict] = []
    for match in matches:
        meta = match.get("metadata", {})
        if not meta.get("text"):
            continue
        results.append({
            "id":    match["id"],
            "score": match["score"],
            **meta,
        })

    return results
