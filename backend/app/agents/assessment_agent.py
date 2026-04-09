"""
Assessment Agent — generates adaptive quizzes & evaluates answers.

Graph flow:
  generate_questions  →  evaluate_answers  →  update_learner_model  →  END
"""

from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm import llm


# ── State schema ────────────────────────────────────────────
class AssessmentState(TypedDict):
    topic_id: str
    knowledge_level: str
    num_questions: int
    questions: list[dict]
    user_answers: list[dict]
    score: int
    feedback: list[str]


# ── Node functions ──────────────────────────────────────────
def generate_questions(state: AssessmentState) -> dict:
    """Generate quiz questions with Gemini based on topic & level."""
    messages = [
        SystemMessage(
            content=(
                f"Generate {state['num_questions']} multiple-choice questions "
                f"on topic '{state['topic_id']}' at '{state['knowledge_level']}' "
                f"difficulty. Return valid JSON array with keys: "
                f"id, text, options (list of 4), correct_answer, explanation."
            )
        ),
        HumanMessage(content="Generate the quiz now."),
    ]
    result = llm.invoke(messages)
    # TODO: parse JSON from result.content
    return {"questions": []}


def evaluate_answers(state: AssessmentState) -> dict:
    """Compare user answers against correct answers and score."""
    # TODO: implement scoring logic
    return {"score": 0, "feedback": []}


def update_learner_model(state: AssessmentState) -> dict:
    """Persist results back to the learner profile."""
    # TODO: call learner_model service
    return {}


# ── Build graph ─────────────────────────────────────────────
def build_assessment_graph():
    graph = StateGraph(AssessmentState)
    graph.add_node("generate_questions", generate_questions)
    graph.add_node("evaluate_answers", evaluate_answers)
    graph.add_node("update_learner_model", update_learner_model)
    graph.add_edge(START, "generate_questions")
    graph.add_edge("generate_questions", "evaluate_answers")
    graph.add_edge("evaluate_answers", "update_learner_model")
    graph.add_edge("update_learner_model", END)
    return graph.compile()


assessment_graph = build_assessment_graph()
