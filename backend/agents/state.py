"""
agents/state.py — Shared AgentState TypedDict used by every agent.

All agents accept an AgentState and return an updated AgentState.
Fields are accumulated across the pipeline — agents only overwrite
the keys they own.
"""

from __future__ import annotations
from typing import TypedDict


class AgentState(TypedDict, total=False):
    """
    Shared state flowing through the LangGraph agent pipeline.

    Fields
    ------
    student_id : str
        UUID of the authenticated student (from JWT).
    student_profile : dict
        Full row from student_profiles (loaded by orchestrator).
    current_agent : str
        Name of the agent currently executing (for tracing).
    messages : list
        LangChain message history for the current session.

    diagnostic_results : dict
        Output of the assessment agent — per-topic scores.
            { "topic": { "score": float, "level": str } }
    learning_path : list
        Ordered list of module dicts produced by curriculum agent.
            [{ "topic": str, "difficulty": str, "prerequisites": [] }, ...]
    current_module : dict
        The module the student is currently working on.
            { "topic": str, "difficulty": str, ... }
    retrieved_chunks : list[str]
        RAG chunks retrieved from Pinecone for the current module topic.

    quiz_results : dict
        Output of the feedback agent — per-question results.
            { "questions": [...], "score": float, "feedback": [...] }
    mastery_score : float
        Overall mastery score from the latest quiz (0.0 – 1.0).

    next_action : str
        Routing decision made by the orchestrator.
        One of: "assessment", "curriculum", "content_delivery",
                "feedback", "advance", "re_explain", "remediate", "complete"
    stream_output : list[str]
        Token-by-token streamed content for the frontend (populated by
        the content_delivery and feedback agents).
    """

    student_id: str
    student_profile: dict
    current_agent: str
    messages: list

    diagnostic_results: dict
    learning_path: list
    current_module: dict
    retrieved_chunks: list[str]

    quiz_results: dict
    mastery_score: float

    next_action: str
    stream_output: list[str]
