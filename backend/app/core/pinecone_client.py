"""
Pinecone client & index singleton.
Index spec: dimension=384, metric=cosine (matches all-MiniLM-L6-v2)
"""

from pinecone import Pinecone, ServerlessSpec
from app.core.config import settings

pc = Pinecone(api_key=settings.pinecone_api_key)

DIMENSION = 384
METRIC = "cosine"


def get_or_create_index():
    """Return a handle to the Pinecone index, creating it if needed."""
    existing = [idx.name for idx in pc.list_indexes()]
    if settings.pinecone_index_name not in existing:
        pc.create_index(
            name=settings.pinecone_index_name,
            dimension=DIMENSION,
            metric=METRIC,
            spec=ServerlessSpec(cloud="aws", region=settings.pinecone_environment),
        )
    return pc.Index(settings.pinecone_index_name)


index = get_or_create_index()
