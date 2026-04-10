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
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Any, AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel

from auth.jwt_dependency import get_current_user_id
from agents.graph import run_session
from agents.state import AgentState
from db.learning_sessions import (
    create_learning_session,
    get_learning_session,
    list_learning_sessions,
    update_learning_session,
)
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
    retrieved_chunks: list = []


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
    retrieved_chunks: list = []


class SessionSummaryResponse(BaseModel):
    session_id: str
    title: str
    status: str
    created_at: str = ""
    updated_at: str = ""
    last_message_at: str = ""
    current_module: dict = {}
    next_action: str = ""
    mastery_score: float = -1.0
    message_count: int = 0
    last_user_message: str = ""
    has_quiz_results: bool = False


class SessionDetailResponse(BaseModel):
    session_id: str
    title: str
    status: str
    created_at: str = ""
    updated_at: str = ""
    last_message_at: str = ""
    messages: list = []
    current_agent: str = ""
    next_action: str = ""
    current_module: dict = {}
    diagnostic_results: dict = {}
    quiz_results: dict = {}
    mastery_score: float = -1.0
    retrieved_chunks: list = []


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
        retrieved_chunks=state.get("retrieved_chunks", []),
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
        retrieved_chunks=state.get("retrieved_chunks", []),
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


def _json_safe(value: Any):
    """Convert state objects into JSON-safe values for Supabase JSONB storage."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return str(value)


def _serializable_state(state: AgentState) -> dict:
    return _json_safe(dict(state)) if isinstance(state, dict) else {}


def _latest_user_text(state: AgentState) -> str:
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, dict) and msg.get("role") == "user":
            content = str(msg.get("content", "")).strip()
            if content:
                return content
    return ""


def _session_title(seed_message: str, state: AgentState) -> str:
    base = " ".join((seed_message or "").split())
    if not base:
        base = " ".join((_latest_user_text(state) or "").split())
    if not base:
        module = state.get("current_module", {})
        base = " ".join(str(module.get("topic", "")).split())
    return (base or "Untitled session")[:120]


def _append_assistant_message_from_stream(state: AgentState) -> None:
    """Store the assistant turn in message history after a streamed response completes."""
    stream_output = state.get("stream_output", [])
    if not stream_output:
        return

    assistant_text = "".join(stream_output).strip()
    if not assistant_text:
        return

    msgs = list(state.get("messages", []))
    if msgs:
        last = msgs[-1]
        if isinstance(last, dict) and last.get("role") == "assistant" and last.get("content") == assistant_text:
            return

    msgs.append({"role": "assistant", "content": assistant_text})
    state["messages"] = msgs


def _persist_session_snapshot(session_id: str, sess: _Session, status: str = "active", title: Optional[str] = None) -> None:
    updates = {
        "state": _serializable_state(sess.state),
        "status": status,
        "last_message_at": datetime.now(timezone.utc).isoformat(),
    }
    if title:
        updates["title"] = title

    try:
        update_learning_session(session_id, updates)
    except Exception as e:
        print(f"⚠  Learning session persist failed for {session_id}: {e}")


def _hydrate_session_from_db(session_id: str, student_id: str) -> Optional[_Session]:
    row = get_learning_session(session_id)
    if not row:
        return None

    if row.get("student_id") != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this session",
        )

    state = row.get("state") or {}
    if not isinstance(state, dict):
        state = {}

    state.setdefault("student_id", student_id)
    state.setdefault("messages", [])
    state.setdefault("current_module", {})
    state.setdefault("diagnostic_results", {})
    state.setdefault("quiz_results", {})
    state.setdefault("stream_output", [])

    sess = _Session(student_id=student_id, state=state)
    _sessions[session_id] = sess
    return sess


def _verify_session_ownership(session_id: str, student_id: str) -> _Session:
    """Check that the session exists and belongs to this student."""
    sess = _sessions.get(session_id)
    if sess is None:
        sess = _hydrate_session_from_db(session_id, student_id)

    if sess is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

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
        _append_assistant_message_from_stream(result_state)
        sess.state = result_state
        _maybe_save_quiz(result_state)
        final_status = "completed" if result_state.get("next_action") == "complete" else "active"
        _persist_session_snapshot(
            session_id,
            sess,
            status=final_status,
            title=_session_title("", result_state),
        )
    except Exception as e:
        sess.error = str(e)
        _persist_session_snapshot(session_id, sess, status="error")


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

    try:
        create_learning_session(
            session_id=session_id,
            student_id=student_id,
            title=_session_title(body.message, initial_state),
            state=_serializable_state(initial_state),
        )
    except Exception as e:
        # Keep runtime flow alive even if persistence fails.
        print(f"⚠  Learning session create failed for {session_id}: {e}")

    # Start the LangGraph run in the background. While it runs, agents will
    # append tokens into sess.state["stream_output"] in real-time.
    sess.task = asyncio.create_task(_run_graph_in_background(session_id, student_id, body.message))

    return _state_to_start_response(session_id, initial_state)


@router.get("/sessions", response_model=list[SessionSummaryResponse])
async def get_sessions(student_id: str = Depends(get_current_user_id)):
    rows = list_learning_sessions(student_id=student_id, limit=100)
    payload: list[SessionSummaryResponse] = []

    for row in rows:
        state = row.get("state") or {}
        if not isinstance(state, dict):
            state = {}

        messages = state.get("messages", [])
        message_count = sum(1 for m in messages if isinstance(m, dict) and m.get("role") in {"user", "assistant"})
        last_user_message = ""
        for m in reversed(messages):
            if isinstance(m, dict) and m.get("role") == "user":
                last_user_message = str(m.get("content", ""))[:160]
                break

        payload.append(SessionSummaryResponse(
            session_id=row.get("id", ""),
            title=row.get("title") or _session_title("", state),
            status=row.get("status", "active"),
            created_at=str(row.get("created_at", "")),
            updated_at=str(row.get("updated_at", "")),
            last_message_at=str(row.get("last_message_at", "")),
            current_module=state.get("current_module", {}),
            next_action=state.get("next_action", ""),
            mastery_score=state.get("mastery_score", -1.0),
            message_count=message_count,
            last_user_message=last_user_message,
            has_quiz_results=bool((state.get("quiz_results") or {}).get("evaluations")),
        ))

    return payload


@router.get("/session/{session_id}", response_model=SessionDetailResponse)
async def get_session_detail(
    session_id: str,
    student_id: str = Depends(get_current_user_id),
):
    row = get_learning_session(session_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )
    if row.get("student_id") != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this session",
        )

    sess = _sessions.get(session_id) or _hydrate_session_from_db(session_id, student_id)
    state = sess.state if sess else (row.get("state") or {})
    if not isinstance(state, dict):
        state = {}

    messages: list[dict] = []
    for msg in state.get("messages", []):
        if isinstance(msg, dict) and msg.get("role") in {"user", "assistant"}:
            messages.append({
                "role": msg.get("role"),
                "content": str(msg.get("content", "")),
            })

    return SessionDetailResponse(
        session_id=session_id,
        title=row.get("title") or _session_title("", state),
        status=row.get("status", "active"),
        created_at=str(row.get("created_at", "")),
        updated_at=str(row.get("updated_at", "")),
        last_message_at=str(row.get("last_message_at", "")),
        messages=messages,
        current_agent=state.get("current_agent", ""),
        next_action=state.get("next_action", ""),
        current_module=state.get("current_module", {}),
        diagnostic_results=state.get("diagnostic_results", {}),
        quiz_results=state.get("quiz_results", {}),
        mastery_score=state.get("mastery_score", -1.0),
        retrieved_chunks=state.get("retrieved_chunks", []),
    )


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

    async def event_generator() -> AsyncGenerator[dict[str, str], None]:
        cursor = 0
        while True:
            if sess.error:
                yield {"event": "error", "data": sess.error}
                yield {"event": "done", "data": "[DONE]"}
                return

            tokens = sess.state.get("stream_output", [])
            while cursor < len(tokens):
                token = tokens[cursor]
                cursor += 1
                if token:
                    yield {"event": "token", "data": token}

            # If the background task finished and we've drained tokens, we're done.
            if sess.task and sess.task.done():
                yield {"event": "done", "data": "[DONE]"}
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
