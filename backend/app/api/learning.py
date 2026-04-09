"""
Learning routes — adaptive content delivery.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/topics")
async def list_topics():
    """Return all available learning topics."""
    # TODO: query Supabase for topics
    return {"topics": []}


@router.get("/topics/{topic_id}/content")
async def get_topic_content(topic_id: str):
    """Return adaptive content for a specific topic."""
    # TODO: call the content-agent to generate personalised content
    return {"topic_id": topic_id, "content": ""}


@router.post("/topics/{topic_id}/progress")
async def update_progress(topic_id: str):
    """Record learner progress on a topic."""
    # TODO: update learner profile in Supabase
    return {"status": "updated"}
