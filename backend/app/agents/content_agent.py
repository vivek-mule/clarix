"""
Content Agent — generates or selects adaptive learning content.

Graph flow:
  assess_learner  →  select_content  →  adapt_difficulty  →  END
"""

from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm import llm


# ── State schema ────────────────────────────────────────────
class ContentState(TypedDict):
    topic_id: str
    knowledge_level: str
    learning_style: str
    learner_gaps: list[str]
    selected_content: str
    adapted_content: str


# ── Node functions ──────────────────────────────────────────
def assess_learner(state: ContentState) -> dict:
    """Determine knowledge gaps from the learner profile."""
    # TODO: query quiz history & learner model
    return {"learner_gaps": []}


def select_content(state: ContentState) -> dict:
    """Pick the best content chunks for the learner's current gaps."""
    # TODO: query Pinecone filtered by topic + difficulty
    return {"selected_content": ""}


def adapt_difficulty(state: ContentState) -> dict:
    """Use the LLM to rewrite content to match the learner's level & style."""
    messages = [
        SystemMessage(
            content=(
                f"Rewrite the following educational content for a "
                f"'{state['knowledge_level']}' level student who prefers "
                f"'{state['learning_style']}' learning.\n\n"
                f"{state['selected_content']}"
            )
        ),
        HumanMessage(content="Please adapt this content for me."),
    ]
    result = llm.invoke(messages)
    return {"adapted_content": result.content}


# ── Build graph ─────────────────────────────────────────────
def build_content_graph():
    graph = StateGraph(ContentState)
    graph.add_node("assess_learner", assess_learner)
    graph.add_node("select_content", select_content)
    graph.add_node("adapt_difficulty", adapt_difficulty)
    graph.add_edge(START, "assess_learner")
    graph.add_edge("assess_learner", "select_content")
    graph.add_edge("select_content", "adapt_difficulty")
    graph.add_edge("adapt_difficulty", END)
    return graph.compile()


content_graph = build_content_graph()
