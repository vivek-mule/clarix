"""
backend/api/agent_routes.py — Exposes the LangGraph agent loop via FastAPI.

Endpoints:
    POST /agent/start-session   → verify JWT, create session, start graph, return session_id
    GET  /agent/stream          → SSE stream of tokens as they are generated
    POST /agent/submit-answer   → inject answer into session, resume graph
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel

from auth.jwt_dependency import get_current_user_id
from agents.graph import run_session
from agents.state import AgentState
from db.quiz_attempts import save_quiz_attempt
from db.student_profile import get_profile

router = APIRouter(prefix="/agent", tags=["Agent"])


# ────────────────────────────────────────────────────────────
#  In-memory session store
# ────────────────────────────────────────────────────────────
@dataclass
class _Session:
    student_id: str
    state: AgentState
    task: Optional[asyncio.Task] = None
    error: Optional[str] = None


# Maps session_id → _Session.
# In production replace with Redis or a DB-backed store.
_sessions: dict[str, _Session] = {}


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


def _verify_session_ownership(session_id: str, student_id: str) -> _Session:
    """Check that the session exists and belongs to this student."""
    if session_id not in _sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )
    sess = _sessions[session_id]
    if sess.student_id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this session",
        )
    return sess


async def _run_graph_in_background(session_id: str, student_id: str, message: str) -> None:
    """Run LangGraph and update the in-memory session state."""
    sess = _sessions.get(session_id)
    if not sess:
        return
    try:
        result_state = await run_session(
            student_id=student_id,
            message=message,
            existing_state=sess.state,
        )
        sess.state = result_state
        _maybe_save_quiz(result_state)
    except Exception as e:
        sess.error = str(e)


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

    # Initialise state now so the SSE endpoint can attach immediately.
    profile = get_profile(student_id) or {}
    initial_state: AgentState = AgentState(
        student_id=student_id,
        student_profile=profile,
        current_agent="",
        messages=[],
        diagnostic_results={},
        learning_path=profile.get("learning_path", []),
        current_module={},
        retrieved_chunks=[],
        quiz_results={},
        mastery_score=-1.0,
        next_action="",
        stream_output=[],
    )

    sess = _Session(student_id=student_id, state=initial_state)
    _sessions[session_id] = sess

    # Start the LangGraph run in the background. While it runs, agents will
    # append tokens into sess.state["stream_output"] in real-time.
    sess.task = asyncio.create_task(_run_graph_in_background(session_id, student_id, body.message))

    return _state_to_start_response(session_id, initial_state)


# ────────────────────────────────────────────────────────────
#  GET /agent/stream
# ────────────────────────────────────────────────────────────

@router.get("/stream")
async def stream_tokens(
    session_id: str,
    student_id: str = Depends(get_current_user_id),
):
    """
    Server-Sent Events (SSE) endpoint.
    Streams tokens from state.stream_output to the frontend in real-time.
    Each token is sent as:  data: <token>
    When complete:          event: done  data: [DONE]
    """
    sess = _verify_session_ownership(session_id, student_id)

    async def event_generator() -> AsyncGenerator[str, None]:
        cursor = 0
        while True:
            if sess.error:
                yield f"event: error\ndata: {sess.error}\n\n"
                yield "event: done\ndata: [DONE]\n\n"
                return

            tokens = sess.state.get("stream_output", [])
            while cursor < len(tokens):
                token = tokens[cursor]
                cursor += 1
                if token:
                    yield f"data: {token}\n\n"

            # If the background task finished and we've drained tokens, we're done.
            if sess.task and sess.task.done():
                yield "event: done\ndata: [DONE]\n\n"
                return

            await asyncio.sleep(0.05)

    return EventSourceResponse(
        event_generator(),
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
    sess = _verify_session_ownership(body.session_id, student_id)

    sess.state["stream_output"] = []
    sess.error = None

    # Resume the graph in the background.
    sess.task = asyncio.create_task(_run_graph_in_background(body.session_id, student_id, body.answer))

    return _state_to_submit_response(body.session_id, sess.state)
