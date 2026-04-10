"""
agents/orchestrator.py — Central routing agent.

Reads the student profile from Supabase and determines the next action:

    ┌─────────────────────────────────────────────────────┐
    │  new student (no knowledge_levels)  →  assessment   │
    │  no learning_path                   →  curriculum   │
    │  has active module                  →  content_delivery │
    │  ready for quiz                     →  feedback     │
    │  after feedback:                                    │
    │      mastery ≥ 0.75  →  advance  (next module)     │
    │      0.50 ≤ m < 0.75 →  re_explain (same module)   │
    │      mastery < 0.50  →  remediate (simplified)     │
    │  all modules done    →  complete                   │
    └─────────────────────────────────────────────────────┘
"""

from __future__ import annotations

from agents.state import AgentState
from db.student_profile import get_profile, update_profile, advance_module


def _latest_user_message(state: AgentState) -> str:
    """Return latest user text from the conversation state."""
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, dict) and msg.get("role") == "user":
            return str(msg.get("content", ""))
    return ""


def _latest_non_quiz_user_message(state: AgentState) -> str:
    """Return latest user message that is likely a learning query, not quiz control input."""
    for msg in reversed(state.get("messages", [])):
        if not (isinstance(msg, dict) and msg.get("role") == "user"):
            continue
        text = str(msg.get("content", "")).strip()
        if not text:
            continue
        if _is_quiz_request(text) or _looks_like_structured_answers(text):
            continue
        return text
    return ""


def _topic_label(text: str, fallback: str = "General learning request", max_len: int = 140) -> str:
    compact = " ".join((text or "").split())
    if not compact:
        return fallback
    return compact[:max_len]


def _is_quiz_request(text: str) -> bool:
    t = (text or "").strip().lower()
    if not t:
        return False

    has_quiz_word = any(word in t for word in ("quiz", "test", "assessment"))
    has_trigger = any(word in t for word in ("ready", "start", "take", "begin", "give"))
    return has_quiz_word and has_trigger


def _looks_like_structured_answers(text: str) -> bool:
    t = (text or "").strip()
    return (t.startswith("[") and t.endswith("]")) or (t.startswith("{") and t.endswith("}"))


def orchestrator_agent(state: AgentState) -> AgentState:
    """
    Read the student's current state and decide what happens next.

    Expects:
        state["student_id"]
        (optionally) state["mastery_score"]  — if coming back from feedback

    Produces:
        state["student_profile"]  (refreshed from DB)
        state["current_module"]
        state["next_action"]
    """
    student_id = state.get("student_id", "")
    if not student_id:
        return {
            **state,
            "current_agent": "orchestrator",
            "next_action": "error",
        }

    # ── Refresh profile from Supabase ───────────────────────
    profile = get_profile(student_id)
    if not profile:
        return {
            **state,
            "current_agent": "orchestrator",
            "next_action": "error",
        }

    knowledge_levels = profile.get("knowledge_levels") or {}
    learning_path = profile.get("learning_path") or []
    current_idx = profile.get("current_module_index", 0)
    mastery_score = state.get("mastery_score", -1.0)  # -1 = no quiz taken yet
    latest_message = _latest_user_message(state).strip()
    quiz = state.get("quiz_results", {}) or {}

    # Resolve current module if available, then adapt it to the latest query.
    current_module = learning_path[current_idx] if current_idx < len(learning_path) else state.get("current_module", {})
    if not isinstance(current_module, dict):
        current_module = {}

    # Query-driven mode: route by latest user intent.
    if latest_message:
        latest_learning_query = _latest_non_quiz_user_message(state)
        stable_topic = _topic_label(
            latest_learning_query,
            fallback=current_module.get("topic", "General learning request"),
        )

        base_module = {
            **current_module,
            "topic": stable_topic,
            "difficulty": current_module.get("difficulty", "intermediate"),
            "learning_objectives": current_module.get("learning_objectives", []),
        }

        awaiting_quiz_answers = bool(quiz.get("questions") and quiz.get("awaiting_answers"))
        if awaiting_quiz_answers and _looks_like_structured_answers(latest_message):
            return {
                **state,
                "current_agent": "orchestrator",
                "student_profile": profile,
                "current_module": {
                    **base_module,
                    "topic": quiz.get("topic", base_module.get("topic", "General learning request")),
                },
                "next_action": "feedback",
            }

        if _is_quiz_request(latest_message):
            return {
                **state,
                "current_agent": "orchestrator",
                "student_profile": profile,
                "current_module": base_module,
                "next_action": "feedback",
            }

        message_topic = _topic_label(latest_message, fallback=base_module.get("topic", "General learning request"))
        return {
            **state,
            "current_agent": "orchestrator",
            "student_profile": profile,
            "current_module": {
                **base_module,
                "topic": message_topic,
            },
            "quiz_results": {},
            "next_action": "content_delivery",
        }

    # ── Decision tree ───────────────────────────────────────

    # 1. New student — needs diagnostic assessment
    if not knowledge_levels:
        return {
            **state,
            "current_agent": "orchestrator",
            "student_profile": profile,
            "next_action": "assessment",
        }

    # 2. No learning path yet — generate curriculum
    if not learning_path:
        return {
            **state,
            "current_agent": "orchestrator",
            "student_profile": profile,
            "next_action": "curriculum",
        }

    # 3. All modules completed
    if current_idx >= len(learning_path):
        return {
            **state,
            "current_agent": "orchestrator",
            "student_profile": profile,
            "next_action": "complete",
            "current_module": {},
        }

    # Determine the current module
    current_module = learning_path[current_idx]
    current_topic = current_module.get("topic", "")

    # 4. After a feedback round — route based on mastery score
    if mastery_score >= 0:
        if mastery_score >= 0.75:
            # Student has mastered the module → advance
            advance_module(student_id, current_topic)

            # Check if this was the last module
            next_idx = current_idx + 1
            if next_idx >= len(learning_path):
                return {
                    **state,
                    "current_agent": "orchestrator",
                    "student_profile": get_profile(student_id) or profile,
                    "next_action": "complete",
                    "current_module": {},
                    "mastery_score": -1.0,
                }

            # Move to next module → deliver content
            next_module = learning_path[next_idx]
            return {
                **state,
                "current_agent": "orchestrator",
                "student_profile": get_profile(student_id) or profile,
                "current_module": next_module,
                "next_action": "advance",
                "mastery_score": -1.0,  # reset for next round
            }

        elif mastery_score >= 0.50:
            # Partial understanding → re-explain the same module
            # Add the topic to struggle_topics if not already present
            struggle = profile.get("struggle_topics", [])
            if current_topic and current_topic not in struggle:
                struggle.append(current_topic)
                update_profile(student_id, {"struggle_topics": struggle})

            return {
                **state,
                "current_agent": "orchestrator",
                "student_profile": profile,
                "current_module": current_module,
                "next_action": "re_explain",
                "mastery_score": -1.0,
            }

        else:
            # Low understanding → remediate (simplified content)
            struggle = profile.get("struggle_topics", [])
            if current_topic and current_topic not in struggle:
                struggle.append(current_topic)
                update_profile(student_id, {"struggle_topics": struggle})

            return {
                **state,
                "current_agent": "orchestrator",
                "student_profile": profile,
                "current_module": current_module,
                "next_action": "remediate",
                "mastery_score": -1.0,
            }

    # 5. Active module, no quiz result yet → deliver content
    return {
        **state,
        "current_agent": "orchestrator",
        "student_profile": profile,
        "current_module": current_module,
        "next_action": "content_delivery",
    }
