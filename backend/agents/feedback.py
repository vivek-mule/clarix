"""
agents/feedback.py — Quiz generation & semantic evaluation agent.

1. Generates a 3-5 question quiz on the current module topic
2. Evaluates student answers SEMANTICALLY via Gemini (not keyword matching)
3. Calculates mastery_score (0.0 – 1.0)
4. Returns detailed per-question feedback
"""

from __future__ import annotations

import json

from langchain_core.messages import HumanMessage, SystemMessage

from agents.state import AgentState
from agents.llm import llm


QUIZ_GENERATION_PROMPT = """\
You are an expert quiz creator for **{subject}**.

Generate exactly {num_questions} quiz questions on the topic: **{topic}**
Difficulty level: **{difficulty}**

The questions should test genuine understanding, not just memorisation.
Mix question types: conceptual, application, and analysis.

Return ONLY a valid JSON array.  Each element:
{{
  "id": <int>,
  "question": "<question text>",
  "type": "mcq" | "short_answer",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."] | null,
  "correct_answer": "<correct answer>",
  "explanation": "<why this is the correct answer>",
  "concept_tested": "<which concept this tests>"
}}

For short_answer questions set options to null.
No markdown fences — pure JSON only.
"""

EVALUATE_QUIZ_PROMPT = """\
You are a fair, expert grader.  Evaluate each student answer SEMANTICALLY.
If the student's response conveys the correct meaning — even with different
wording, synonyms, or minor phrasing differences — mark it CORRECT.
Only mark INCORRECT if the core concept is wrong or missing.

**Questions with correct answers:**
{questions_json}

**Student answers:**
{answers_json}

For each question return a JSON object:
{{
  "id": <int>,
  "correct": true | false,
  "student_answer": "<verbatim student answer>",
  "expected_answer": "<correct answer>",
  "concept_tested": "<concept>",
  "feedback": "<2-3 sentence explanation — what was right/wrong and why>",
  "suggestion": "<if wrong, a brief hint to help the student understand>"
}}

Return a JSON array.  No markdown fences.
"""


def feedback_agent(state: AgentState) -> AgentState:
    """
    Generate a quiz, evaluate answers, and return mastery score + feedback.

    Two-phase operation:
      Phase 1 (no answers yet): generate questions, return them in quiz_results
                                with "awaiting_answers": True
      Phase 2 (answers present): evaluate semantically, score, return feedback

    Expects:
        state["student_profile"]
        state["current_module"]
        state["messages"]  (student quiz answers as last HumanMessage)

    Produces:
        state["quiz_results"]
        state["mastery_score"]
        state["stream_output"]  (rendered feedback)
    """
    profile = state.get("student_profile", {})
    module = state.get("current_module", {})
    subject = profile.get("subject", "general")
    topic = module.get("topic", "unknown")
    difficulty = module.get("difficulty", "intermediate")
    num_questions = 4  # within the 3-5 range

    # Check if we already have generated questions in state
    existing_quiz = state.get("quiz_results", {})
    questions = existing_quiz.get("questions")

    # ── Phase 1: Generate quiz questions ────────────────────
    if not questions:
        gen_messages = [
            SystemMessage(content=QUIZ_GENERATION_PROMPT.format(
                subject=subject,
                topic=topic,
                difficulty=difficulty,
                num_questions=num_questions,
            )),
            HumanMessage(content="Generate the quiz now."),
        ]

        gen_response = llm.invoke(gen_messages)
        raw = gen_response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

        try:
            questions = json.loads(raw)
        except json.JSONDecodeError:
            state["current_agent"] = "feedback"
            state["quiz_results"] = {"error": "Failed to generate quiz questions"}
            state["mastery_score"] = 0.0
            return state

        state["current_agent"] = "feedback"
        state["quiz_results"] = {"questions": questions, "awaiting_answers": True}
        state["mastery_score"] = 0.0
        return state

    # ── Phase 2: Evaluate student answers ───────────────────
    student_answers_raw = ""
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, dict) and msg.get("role") == "user":
            student_answers_raw = msg.get("content", "")
            break
        elif isinstance(msg, HumanMessage):
            student_answers_raw = msg.content
            break

    if not student_answers_raw:
        state["current_agent"] = "feedback"
        state["quiz_results"] = {"questions": questions, "awaiting_answers": True}
        state["mastery_score"] = 0.0
        return state

    eval_messages = [
        SystemMessage(content=EVALUATE_QUIZ_PROMPT.format(
            questions_json=json.dumps(questions, indent=2),
            answers_json=student_answers_raw,
        )),
        HumanMessage(content="Evaluate the quiz answers now."),
    ]

    eval_response = llm.invoke(eval_messages)
    raw_eval = eval_response.content.strip()
    if raw_eval.startswith("```"):
        raw_eval = raw_eval.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        evaluations = json.loads(raw_eval)
    except json.JSONDecodeError:
        evaluations = []

    # ── Calculate mastery score ─────────────────────────────
    total = len(evaluations) if evaluations else 1
    correct_count = sum(1 for e in evaluations if e.get("correct", False))
    mastery_score = round(correct_count / total, 2)

    # ── Build detailed feedback stream ──────────────────────
    # Important: mutate state["stream_output"] as tokens arrive so the SSE
    # endpoint can stream in real-time while the graph is running.
    state["stream_output"] = []
    feedback_messages = [
        SystemMessage(content=(
            f"Summarise the quiz results for the student in an encouraging, "
            f"conversational tone.\n\n"
            f"Score: {correct_count}/{total} ({int(mastery_score * 100)}%)\n"
            f"Results: {json.dumps(evaluations, indent=2)}\n\n"
            f"For each wrong answer, explain the correct concept briefly. "
            f"End with encouragement and a recommendation for next steps."
        )),
        HumanMessage(content="Give me my quiz feedback."),
    ]

    for chunk in llm.stream(feedback_messages):
        token = chunk.content
        if token:
            state["stream_output"].append(token)

    state["current_agent"] = "feedback"
    state["quiz_results"] = {
        "questions": questions,
        "evaluations": evaluations,
        "correct": correct_count,
        "total": total,
    }
    state["mastery_score"] = mastery_score
    return state
