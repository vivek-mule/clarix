"""
Tutor Agent — conversational AI tutor built with LangGraph.

Graph flow:
  retrieve_context  →  generate_response  →  END
"""

from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm import llm
from app.services.knowledge_base import query_similar


# ── State schema ────────────────────────────────────────────
class TutorState(TypedDict):
    user_query: str
    topic_id: str
    knowledge_level: str
    context_chunks: list[dict]
    response: str


# ── Node functions ──────────────────────────────────────────
def retrieve_context(state: TutorState) -> dict:
    """Retrieve relevant content chunks from the vector store."""
    chunks = query_similar(state["user_query"], top_k=5)
    return {"context_chunks": chunks}


def generate_response(state: TutorState) -> dict:
    """Generate a tutoring response using Gemini + retrieved context."""
    context_text = "\n\n".join(
        c.get("metadata", {}).get("text", "") for c in state["context_chunks"]
    )

    system_prompt = (
        f"You are an expert tutor. The student's knowledge level is "
        f"'{state['knowledge_level']}'. Use the following reference material "
        f"to answer their question. Adapt your explanation to their level.\n\n"
        f"--- Reference Material ---\n{context_text}\n--- End ---"
    )

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=state["user_query"]),
    ]

    result = llm.invoke(messages)
    return {"response": result.content}


# ── Build graph ─────────────────────────────────────────────
def build_tutor_graph():
    graph = StateGraph(TutorState)
    graph.add_node("retrieve_context", retrieve_context)
    graph.add_node("generate_response", generate_response)
    graph.add_edge(START, "retrieve_context")
    graph.add_edge("retrieve_context", "generate_response")
    graph.add_edge("generate_response", END)
    return graph.compile()


tutor_graph = build_tutor_graph()
