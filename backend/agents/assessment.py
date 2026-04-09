"""
agents/assessment.py — Diagnostic assessment agent.

Generates 5-8 adaptive diagnostic questions via Gemini, evaluates student
answers SEMANTICALLY (not keyword matching), and writes the resulting
knowledge_levels map back to Supabase.

Flow:
    1. Generate questions tailored to the student's subject
    2. (In production the student answers; here we assume answers are
       passed in via state["messages"])
    3. Evaluate each answer semantically via Gemini
    4. Compute per-topic knowledge levels
    5. Persist to Supabase
"""

from __future__ import annotations

import json

from langchain_core.messages import HumanMessage, SystemMessage

from agents.state import AgentState
from agents.llm import llm
from db.student_profile import update_profile


# ── Prompt templates ────────────────────────────────────────

GENERATE_QUESTIONS_PROMPT = """\
You are an expert educational assessor.  The student is studying **{subject}**.

Generate exactly {num_questions} diagnostic multiple-choice questions that
span different topics and difficulty levels within the subject.  The goal
is to map the student's current knowledge.

Return ONLY a valid JSON array.  Each element must have:
{{
  "id": <int>,
  "topic": "<sub-topic name>",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "question": "<question text>",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "<letter>",
  "explanation": "<why this is correct>"
}}

No markdown fences — pure JSON only.
"""

EVALUATE_ANSWERS_PROMPT = """\
You are a fair, expert grader.  Evaluate each student answer SEMANTICALLY —
if the student's response conveys the same meaning as the correct answer,
mark it correct even if the wording differs.  Do NOT use simple string
matching.

Questions and correct answers:
{questions_json}

Student answers:
{answers_json}

For each question return a JSON object:
{{
  "id": <int>,
  "topic": "<topic>",
  "correct": true | false,
  "student_answer": "<what the student said>",
  "expected_answer": "<correct answer>",
  "feedback": "<brief explanation>"
}}

Return a JSON array of these objects.  No markdown fences.
"""


# ── Agent function ──────────────────────────────────────────

def assessment_agent(state: AgentState) -> AgentState:
    """
    Run the diagnostic assessment flow.

    Expects:
        state["student_id"]
        state["student_profile"]  (needs "subject")
        state["messages"]         (student answers as the last HumanMessage,
                                   formatted as JSON: [{"id": 1, "answer": "B"}, ...])

    Produces:
        state["diagnostic_results"]
        Writes knowledge_levels to Supabase.
    """
    profile = state.get("student_profile", {})
    subject = profile.get("subject", "general")
    num_questions = 6  # within the 5-8 range

    # ── Step 1: Generate diagnostic questions ───────────────
    gen_messages = [
        SystemMessage(content=GENERATE_QUESTIONS_PROMPT.format(
            subject=subject,
            num_questions=num_questions,
        )),
        HumanMessage(content="Generate the diagnostic questions now."),
    ]

    gen_response = llm.invoke(gen_messages)
    raw_questions = gen_response.content.strip()

    # Parse — strip markdown fences if the model adds them anyway
    if raw_questions.startswith("```"):
        raw_questions = raw_questions.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        questions = json.loads(raw_questions)
    except json.JSONDecodeError:
        # Fallback: return empty diagnostics rather than crash
        return {
            **state,
            "current_agent": "assessment",
            "diagnostic_results": {"error": "Failed to parse generated questions"},
        }

    # ── Step 2: Extract student answers from messages ───────
    student_answers_raw = ""
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, dict) and msg.get("role") == "user":
            student_answers_raw = msg.get("content", "")
            break
        elif isinstance(msg, HumanMessage):
            student_answers_raw = msg.content
            break

    if not student_answers_raw:
        # No answers yet — return the questions for the frontend to present
        return {
            **state,
            "current_agent": "assessment",
            "diagnostic_results": {"questions": questions, "awaiting_answers": True},
        }

    # ── Step 3: Evaluate answers semantically ───────────────
    eval_messages = [
        SystemMessage(content=EVALUATE_ANSWERS_PROMPT.format(
            questions_json=json.dumps(questions, indent=2),
            answers_json=student_answers_raw,
        )),
        HumanMessage(content="Evaluate the answers now."),
    ]

    eval_response = llm.invoke(eval_messages)
    raw_eval = eval_response.content.strip()
    if raw_eval.startswith("```"):
        raw_eval = raw_eval.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        evaluations = json.loads(raw_eval)
    except json.JSONDecodeError:
        evaluations = []

    # ── Step 4: Compute knowledge levels per topic ──────────
    topic_scores: dict[str, list[bool]] = {}
    for ev in evaluations:
        topic = ev.get("topic", "unknown")
        topic_scores.setdefault(topic, []).append(ev.get("correct", False))

    knowledge_levels: dict[str, dict] = {}
    for topic, results in topic_scores.items():
        score = sum(results) / len(results) if results else 0
        if score >= 0.75:
            level = "advanced"
        elif score >= 0.40:
            level = "intermediate"
        else:
            level = "beginner"
        knowledge_levels[topic] = {"score": round(score, 2), "level": level}

    # ── Step 5: Persist to Supabase ─────────────────────────
    student_id = state.get("student_id", "")
    if student_id:
        update_profile(student_id, {"knowledge_levels": knowledge_levels})

    return {
        **state,
        "current_agent": "assessment",
        "diagnostic_results": {
            "questions": questions,
            "evaluations": evaluations,
            "knowledge_levels": knowledge_levels,
        },
    }
