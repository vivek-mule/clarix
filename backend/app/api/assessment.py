"""
Assessment routes — quizzes, evaluations, and knowledge checks.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AnswerSubmission(BaseModel):
    question_id: str
    selected_option: str


@router.get("/quiz/{topic_id}")
async def generate_quiz(topic_id: str):
    """Generate an adaptive quiz for the given topic."""
    # TODO: call the assessment-agent
    return {"topic_id": topic_id, "questions": []}


@router.post("/quiz/{topic_id}/submit")
async def submit_answers(topic_id: str, answers: list[AnswerSubmission]):
    """Score a quiz and update the learner model."""
    # TODO: evaluate answers & feed results back to the learner model
    return {"score": 0, "total": len(answers), "feedback": []}
