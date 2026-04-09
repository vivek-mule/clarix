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
    completed_modules = profile.get("completed_modules") or []
    mastery_score = state.get("mastery_score", -1.0)  # -1 = no quiz taken yet

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
