"""
backend/api/student_routes.py — Student profile & progress endpoints.

Every route is protected by the JWT dependency.  The student_id always
comes from the verified token — never from the request body or URL.

    GET  /student/profile     →  full student profile
    POST /student/onboarding  →  save onboarding answers & set learning path
    GET  /student/progress    →  progress snapshot
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.jwt_dependency import get_current_user_id
from db.quiz_attempts import get_all_attempts
from db.student_profile import get_profile, get_progress, mark_onboarding_complete

router = APIRouter(prefix="/student", tags=["Student"])


# ── Request / Response schemas ──────────────────────────────

class OnboardingRequest(BaseModel):
    learning_style: str                  # visual | auditory | reading | kinesthetic
    knowledge_levels: dict = {}          # {"topic": "beginner|intermediate|advanced"}
    learning_path: list = []             # ordered list of module dicts


class ProfileResponse(BaseModel):
    id: str
    name: str
    onboarding_complete: bool
    learning_style: Optional[str]
    knowledge_levels: dict
    learning_path: list
    current_module_index: int
    completed_modules: list
    struggle_topics: list


class ProgressResponse(BaseModel):
    current_module_index: int
    completed_modules: list
    learning_path: list
    knowledge_levels: dict
    struggle_topics: list
    onboarding_complete: bool


class QuizAttemptResponse(BaseModel):
    id: str
    module_topic: str
    score: float
    questions: list
    attempt_number: int
    created_at: str


# ── Routes ──────────────────────────────────────────────────

@router.get("/profile", response_model=ProfileResponse)
async def read_profile(student_id: str = Depends(get_current_user_id)):
    """Return the full student profile for the authenticated user."""
    profile = get_profile(student_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Complete registration first.",
        )
    return ProfileResponse(**profile)


@router.post("/onboarding", response_model=ProfileResponse)
async def save_onboarding(
    body: OnboardingRequest,
    student_id: str = Depends(get_current_user_id),
):
    """
    Called once after the student completes the onboarding questionnaire.
    Saves learning style, initial knowledge levels, and the generated
    learning path.  Flips onboarding_complete to True.
    """
    updated = mark_onboarding_complete(
        student_id=student_id,
        learning_style=body.learning_style,
        knowledge_levels=body.knowledge_levels,
        learning_path=body.learning_path,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found.",
        )
    return ProfileResponse(**updated)


@router.get("/progress", response_model=ProgressResponse)
async def read_progress(student_id: str = Depends(get_current_user_id)):
    """Return a lightweight progress snapshot for the authenticated user."""
    progress = get_progress(student_id)
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found.",
        )
    return ProgressResponse(**progress)


@router.get("/quiz-attempts", response_model=list[QuizAttemptResponse])
async def read_quiz_attempts(student_id: str = Depends(get_current_user_id)):
    """Return quiz attempts for the authenticated user, newest first."""
    attempts = get_all_attempts(student_id)
    payload: list[QuizAttemptResponse] = []
    for row in attempts:
        payload.append(QuizAttemptResponse(
            id=row.get("id", ""),
            module_topic=row.get("module_topic", ""),
            score=row.get("score", 0.0),
            questions=row.get("questions", []),
            attempt_number=row.get("attempt_number", 1),
            created_at=str(row.get("created_at", "")),
        ))
    return payload
