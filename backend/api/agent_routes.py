"""
backend/api/agent_routes.py — Exposes the LangGraph agent loop via FastAPI.

Endpoints:
    POST /agent/start-session   → initialise & run the graph, return session_id
    GET  /agent/stream/{sid}    → SSE stream of tokens from stream_output
    POST /agent/submit-answer   → inject answer into session, resume graph
"""

from __future__ import annotations

import asyncio
import json
import uuid
from collections import defaultdict
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth.jwt_dependency import get_current_user_id
from agents.graph import run_session
from agents.state import AgentState
from db.quiz_attempts import save_quiz_attempt

router = APIRouter(prefix="/agent", tags=["Agent"])


# ────────────────────────────────────────────────────────────
#  In-memory session store
# ────────────────────────────────────────────────────────────
# Maps session_id → AgentState.
# In production replace with Redis or a DB-backed store.
_sessions: dict[str, AgentState] = {}
# Maps session_id → student_id (for ownership verification)
_session_owners: dict[str, str] = {}


# ────────────────────────────────────────────────────────────
#  Request / Response schemas
# ────────────────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    message: str = ""  # optional initial message / intent


class StartSessionResponse(BaseModel):
    session_id: str
    next_action: str
    current_agent: str
    current_module: dict = {}
    diagnostic_results: dict = {}
    quiz_results: dict = {}
    mastery_score: float = -1.0
    has_stream: bool = False  # True if stream_output is populated


class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str  # student answer text (or JSON for quiz answers)


class SubmitAnswerResponse(BaseModel):
    session_id: str
    next_action: str
    current_agent: str
    current_module: dict = {}
    quiz_results: dict = {}
    mastery_score: float = -1.0
    has_stream: bool = False


# ────────────────────────────────────────────────────────────
#  Helpers
# ────────────────────────────────────────────────────────────

def _state_to_start_response(session_id: str, state: AgentState) -> StartSessionResponse:
    return StartSessionResponse(
        session_id=session_id,
        next_action=state.get("next_action", ""),
        current_agent=state.get("current_agent", ""),
        current_module=state.get("current_module", {}),
        diagnostic_results=state.get("diagnostic_results", {}),
        quiz_results=state.get("quiz_results", {}),
        mastery_score=state.get("mastery_score", -1.0),
        has_stream=bool(state.get("stream_output")),
    )


def _state_to_submit_response(session_id: str, state: AgentState) -> SubmitAnswerResponse:
    return SubmitAnswerResponse(
        session_id=session_id,
        next_action=state.get("next_action", ""),
        current_agent=state.get("current_agent", ""),
        current_module=state.get("current_module", {}),
        quiz_results=state.get("quiz_results", {}),
        mastery_score=state.get("mastery_score", -1.0),
        has_stream=bool(state.get("stream_output")),
    )


def _maybe_save_quiz(state: AgentState) -> None:
    """If the feedback agent just completed with results, save the quiz attempt."""
    if state.get("current_agent") != "feedback":
        return

    quiz = state.get("quiz_results", {})
    if quiz.get("awaiting_answers") or not quiz.get("evaluations"):
        return

    student_id = state.get("student_id", "")
    module = state.get("current_module", {})
    topic = module.get("topic", "unknown")
    score = state.get("mastery_score", 0.0)
    questions = quiz.get("evaluations", [])

    if student_id and questions:
        try:
            save_quiz_attempt(
                student_id=student_id,
                module_topic=topic,
                score=score,
                questions=questions,
            )
        except Exception as e:
            print(f"⚠  Quiz attempt save failed: {e}")


def _verify_session_ownership(session_id: str, student_id: str) -> AgentState:
    """Check that the session exists and belongs to this student."""
    if session_id not in _sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )
    if _session_owners.get(session_id) != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this session",
        )
    return _sessions[session_id]


# ────────────────────────────────────────────────────────────
#  POST /agent/start-session
# ────────────────────────────────────────────────────────────

@router.post("/start-session", response_model=StartSessionResponse)
async def start_session(
    body: StartSessionRequest,
    student_id: str = Depends(get_current_user_id),
):
    """
    Initialize a new learning session:
    1. Verify JWT → extract student_id
    2. Build initial AgentState
    3. Invoke the LangGraph pipeline
    4. Store the resulting state under a new session_id
    5. Return session metadata to the client
    """
    session_id = str(uuid.uuid4())

    # Run the graph
    result_state = await run_session(
        student_id=student_id,
        message=body.message,
    )

    # Persist quiz attempt if feedback agent just finished
    _maybe_save_quiz(result_state)

    # Store session
    _sessions[session_id] = result_state
    _session_owners[session_id] = student_id

    return _state_to_start_response(session_id, result_state)


# ────────────────────────────────────────────────────────────
#  GET /agent/stream/{session_id}
# ────────────────────────────────────────────────────────────

@router.get("/stream/{session_id}")
async def stream_tokens(
    session_id: str,
    student_id: str = Depends(get_current_user_id),
):
    """
    Server-Sent Events (SSE) endpoint.
    Streams tokens from state.stream_output to the frontend in real-time.
    Each token is sent as:  data: {"token": "..."}
    When complete:          data: [DONE]
    """
    state = _verify_session_ownership(session_id, student_id)

    tokens = state.get("stream_output", [])

    async def event_generator() -> AsyncGenerator[str, None]:
        for token in tokens:
            # SSE format: each event is "data: <payload>\n\n"
            payload = json.dumps({"token": token})
            yield f"data: {payload}\n\n"
            # Small delay to emulate real-time streaming and prevent
            # overwhelming slow clients
            await asyncio.sleep(0.01)

        # Signal completion
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )


# ────────────────────────────────────────────────────────────
#  POST /agent/submit-answer
# ────────────────────────────────────────────────────────────

@router.post("/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    body: SubmitAnswerRequest,
    student_id: str = Depends(get_current_user_id),
):
    """
    Accept the student's answer, inject it into the session's message
    history, and resume the LangGraph pipeline.

    The student_id comes from the verified JWT — never from the body.
    """
    existing_state = _verify_session_ownership(body.session_id, student_id)

    # Resume the graph with the new answer
    result_state = await run_session(
        student_id=student_id,
        message=body.answer,
        existing_state=existing_state,
    )

    # Persist quiz attempt if feedback agent just finished
    _maybe_save_quiz(result_state)

    # Update stored session
    _sessions[body.session_id] = result_state

    return _state_to_submit_response(body.session_id, result_state)
