"""
agents/graph.py — LangGraph StateGraph wiring all five agents.

Architecture:
    ┌─────────────┐
    │ orchestrator │ ◄──────────────────────────────────┐
    └──────┬──────┘                                     │
           │ conditional edge (next_action)             │
           ├──→ assessment ─────────────────────────────┤
           ├──→ curriculum ─────────────────────────────┤
           ├──→ content_delivery ───────────────────────┤
           ├──→ feedback ───────────────────────────────┤
           └──→ END (complete / error / streaming)      │
                                                        │
    After each sub-agent completes → back to orchestrator

Usage:
    from agents.graph import run_session

    result = await run_session(
        student_id="uuid-here",
        message="I want to learn about Newton's laws",
    )
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Literal, Optional

from langgraph.graph import StateGraph, START, END

from agents.state import AgentState
from agents.orchestrator import orchestrator_agent
from agents.assessment import assessment_agent
from agents.curriculum import curriculum_agent
from agents.content_delivery import content_delivery_agent
from agents.feedback import feedback_agent
from db.student_profile import get_profile
from auth.supabase_client import supabase_admin


# ────────────────────────────────────────────────────────────
#  Session logging helper
# ────────────────────────────────────────────────────────────

def _log_session(student_id: str, agent_trace: dict) -> None:
    """Persist a session trace to the session_logs table."""
    try:
        supabase_admin.table("session_logs").insert({
            "student_id": student_id,
            "agent_trace": agent_trace,
            "session_start": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        print(f"⚠  Session log write failed: {e}")


# ────────────────────────────────────────────────────────────
#  Node wrappers — persist state after each agent runs
# ────────────────────────────────────────────────────────────
# LangGraph nodes must be plain functions that accept and return state.
# These thin wrappers call the real agent, then log the trace.

def _orchestrator_node(state: AgentState) -> AgentState:
    result = orchestrator_agent(state)
    _log_agent_step(result, "orchestrator")
    return result


def _assessment_node(state: AgentState) -> AgentState:
    result = assessment_agent(state)
    _log_agent_step(result, "assessment")
    return result


def _curriculum_node(state: AgentState) -> AgentState:
    result = curriculum_agent(state)
    _log_agent_step(result, "curriculum")
    return result


def _content_delivery_node(state: AgentState) -> AgentState:
    result = content_delivery_agent(state)
    _log_agent_step(result, "content_delivery")
    return result


def _feedback_node(state: AgentState) -> AgentState:
    result = feedback_agent(state)
    _log_agent_step(result, "feedback")
    return result


def _log_agent_step(state: AgentState, agent_name: str) -> None:
    """Log a lightweight trace per agent step (non-blocking)."""
    student_id = state.get("student_id", "")
    if not student_id:
        return
    _log_session(student_id, {
        "agent": agent_name,
        "next_action": state.get("next_action", ""),
        "mastery_score": state.get("mastery_score", -1),
        "current_module": state.get("current_module", {}).get("topic", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# ────────────────────────────────────────────────────────────
#  Conditional routing from orchestrator
# ────────────────────────────────────────────────────────────

# Next-action values the orchestrator can produce
AGENT_ACTIONS = {"assessment", "curriculum", "content_delivery", "feedback"}
# Actions that route back to content_delivery (re_explain / remediate / advance)
CONTENT_REROUTES = {"re_explain", "remediate", "advance"}
TERMINAL_ACTIONS = {"complete", "error"}


def _route_next_action(
    state: AgentState,
) -> Literal[
    "assessment",
    "curriculum",
    "content_delivery",
    "feedback",
    "__end__",
]:
    """
    Conditional edge function — reads state["next_action"] and returns
    the name of the next node to execute.
    """
    action = state.get("next_action", "error")

    if action in AGENT_ACTIONS:
        return action

    if action in CONTENT_REROUTES:
        # advance / re_explain / remediate all go through content_delivery
        return "content_delivery"

    # "complete", "error", or anything unknown → terminate
    return END


# ────────────────────────────────────────────────────────────
#  After sub-agents: route back to orchestrator or end
# ────────────────────────────────────────────────────────────

def _after_subagent(
    state: AgentState,
) -> Literal["orchestrator", "__end__"]:
    """
    After a sub-agent completes, route back to orchestrator so it can
    decide what happens next.

    Exception: if stream_output is populated (content_delivery or feedback
    just streamed a response), go to END so the caller can send the
    response to the client.  The next invocation of run_session() will
    re-enter the graph at orchestrator.
    """
    stream = state.get("stream_output", [])
    if stream:
        return END

    # If the feedback agent is awaiting answers, also stop
    quiz = state.get("quiz_results", {})
    if quiz.get("awaiting_answers"):
        return END

    # If assessment is awaiting answers, stop
    diag = state.get("diagnostic_results", {})
    if diag.get("awaiting_answers"):
        return END

    return "orchestrator"


# ────────────────────────────────────────────────────────────
#  Build the graph
# ────────────────────────────────────────────────────────────

def compile():
    """Build and compile the LangGraph StateGraph. Returns the runnable."""
    graph = StateGraph(AgentState)

    # ── Add nodes ───────────────────────────────────────────
    graph.add_node("orchestrator", _orchestrator_node)
    graph.add_node("assessment", _assessment_node)
    graph.add_node("curriculum", _curriculum_node)
    graph.add_node("content_delivery", _content_delivery_node)
    graph.add_node("feedback", _feedback_node)

    # ── Entry point ─────────────────────────────────────────
    graph.add_edge(START, "orchestrator")

    # ── Orchestrator → conditional fan-out ──────────────────
    graph.add_conditional_edges(
        "orchestrator",
        _route_next_action,
        {
            "assessment": "assessment",
            "curriculum": "curriculum",
            "content_delivery": "content_delivery",
            "feedback": "feedback",
            END: END,
        },
    )

    # ── Sub-agents → conditional return ─────────────────────
    for node_name in ("assessment", "curriculum", "content_delivery", "feedback"):
        graph.add_conditional_edges(
            node_name,
            _after_subagent,
            {
                "orchestrator": "orchestrator",
                END: END,
            },
        )

    return graph.compile()


# Pre-compiled graph singleton
app_graph = compile()


# ────────────────────────────────────────────────────────────
#  Public API: run_session
# ────────────────────────────────────────────────────────────

async def run_session(
    student_id: str,
    message: str = "",
    existing_state: Optional[AgentState] = None,
) -> AgentState:
    """
    Run (or continue) a learning session for a student.

    Args:
        student_id:      Authenticated student UUID.
        message:         The student's latest message / answer.
        existing_state:  If continuing a session, pass the previous state
                         so quiz answers and context are preserved.

    Returns:
        The final AgentState after the graph terminates.  The caller
        should check:
            - state["stream_output"]  → content to send to the client
            - state["next_action"]    → what the system is waiting for
            - state["quiz_results"]   → if awaiting quiz answers
            - state["diagnostic_results"] → if awaiting diagnostic answers
    """
    # Build initial state
    if existing_state:
        # Reuse the same dict object so other coroutines (SSE) can observe
        # stream_output growth while the graph runs.
        initial_state = existing_state
        initial_state["student_id"] = student_id
        initial_state["stream_output"] = []  # always reset stream for new invocation

        # Append the new message
        if message:
            msgs = list(initial_state.get("messages", []))
            msgs.append({"role": "user", "content": message})
            initial_state["messages"] = msgs
    else:
        profile = get_profile(student_id) or {}
        initial_state = AgentState(
            student_id=student_id,
            student_profile=profile,
            current_agent="",
            messages=[{"role": "user", "content": message}] if message else [],
            diagnostic_results={},
            learning_path=profile.get("learning_path", []),
            current_module={},
            retrieved_chunks=[],
            quiz_results={},
            mastery_score=-1.0,
            next_action="",
            stream_output=[],
        )

    # LangGraph's invoke is synchronous — run in a thread so we don't
    # block the FastAPI event loop
    result = await asyncio.to_thread(app_graph.invoke, initial_state)

    return result
