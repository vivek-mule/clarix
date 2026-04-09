"""
Chat routes — conversational AI tutor.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    user_id: str
    topic_id: str
    messages: list[ChatMessage]


@router.post("/send")
async def send_message(body: ChatRequest):
    """Send a message to the AI tutor and get a response."""
    # TODO: invoke the tutor-agent via LangGraph
    return {
        "reply": "",
        "sources": [],
    }


@router.get("/history/{user_id}")
async def get_history(user_id: str):
    """Retrieve past chat history for a user."""
    # TODO: query Supabase chat_history table
    return {"messages": []}
