"""
Pydantic schemas for domain entities.
"""

from pydantic import BaseModel
from datetime import datetime


# ── Learner ─────────────────────────────────────────────────
class LearnerProfile(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    knowledge_level: str = "beginner"  # beginner | intermediate | advanced
    learning_style: str = "visual"     # visual | auditory | reading | kinesthetic
    created_at: datetime | None = None


# ── Topic / Content ────────────────────────────────────────
class Topic(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str = "beginner"
    prerequisites: list[str] = []


class ContentChunk(BaseModel):
    id: str
    topic_id: str
    text: str
    metadata: dict = {}


# ── Assessment ──────────────────────────────────────────────
class Question(BaseModel):
    id: str
    topic_id: str
    text: str
    options: list[str]
    correct_answer: str
    explanation: str = ""
    difficulty: str = "medium"


class QuizResult(BaseModel):
    user_id: str
    topic_id: str
    score: int
    total: int
    timestamp: datetime | None = None


# ── Chat ────────────────────────────────────────────────────
class ChatEntry(BaseModel):
    role: str
    content: str
    timestamp: datetime | None = None
