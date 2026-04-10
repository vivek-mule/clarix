"""
agents/curriculum.py — Curriculum planning agent.

Reads knowledge_levels from the diagnostic assessment, generates an ordered
module list respecting prerequisites and difficulty progression, and writes
the resulting learning_path back to Supabase.
"""

from __future__ import annotations

import json

from langchain_core.messages import HumanMessage, SystemMessage

from agents.state import AgentState
from agents.llm import llm
from db.student_profile import update_profile


CURRICULUM_PROMPT = """\
You are an expert curriculum designer.  Based on the student's diagnostic
results and profile, generate a structured, ordered learning path.

**Student profile:**
- Name: {name}
- Learning style: {learning_style}
- Current knowledge levels: {knowledge_levels}

**Rules:**
1. Modules must progress from the student's weakest topics to strongest.
2. Each module should list its prerequisites (earlier modules the student
   must complete first).
3. Assign a difficulty (beginner / intermediate / advanced) matching the
   student's current level on that topic — then ramp one level up.
4. Include 6-12 modules for a comprehensive path.
5. For topics the student already knows well, include an "advanced"
   challenge module rather than skipping entirely.

Return ONLY a valid JSON array. Each element:
{{
  "module_index": <int starting at 0>,
  "topic": "<topic name>",
  "title": "<human-friendly module title>",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "prerequisites": [<list of prerequisite topic strings>],
  "estimated_minutes": <int>,
  "learning_objectives": ["<objective 1>", "<objective 2>"]
}}

No markdown fences — pure JSON only.
"""


def curriculum_agent(state: AgentState) -> AgentState:
    """
    Generate an ordered learning path and persist it.

    Expects:
        state["student_id"]
        state["student_profile"]
        state["diagnostic_results"]["knowledge_levels"]  (or profile's knowledge_levels)

    Produces:
        state["learning_path"]
        Writes learning_path to Supabase.
    """
    profile = state.get("student_profile", {})
    diag = state.get("diagnostic_results", {})

    knowledge_levels = diag.get("knowledge_levels") or profile.get("knowledge_levels", {})

    messages = [
        SystemMessage(content=CURRICULUM_PROMPT.format(
            name=profile.get("name", "Student"),
            learning_style=profile.get("learning_style", "not specified"),
            knowledge_levels=json.dumps(knowledge_levels, indent=2),
        )),
        HumanMessage(content="Generate the learning path now."),
    ]

    response = llm.invoke(messages)
    raw = response.content.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        learning_path = json.loads(raw)
    except json.JSONDecodeError:
        learning_path = []

    # Persist to Supabase
    student_id = state.get("student_id", "")
    if student_id and learning_path:
        update_profile(student_id, {
            "learning_path": learning_path,
            "current_module_index": 0,
            "onboarding_complete": True,
        })

    # Set current_module to the first module
    current_module = learning_path[0] if learning_path else {}

    return {
        **state,
        "current_agent": "curriculum",
        "learning_path": learning_path,
        "current_module": current_module,
    }
