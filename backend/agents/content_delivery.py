"""
agents/content_delivery.py — Personalised content delivery agent.

1. Embeds the latest student query locally (all-MiniLM-L6-v2)
2. Queries Pinecone via rag/retriever.py across available namespaces
3. Sends retrieved chunks + student profile to Gemini
4. Generates a personalised explanation adapted to learning_style
5. Streams response tokens into state["stream_output"]
"""

from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from agents.state import AgentState
from agents.llm import llm
from config import settings
from rag.retriever import retrieve_chunks


CONTENT_PROMPT = """\
You are an expert tutor delivering a lesson.

**Student profile:**
- Name: {name}
- Learning style: {learning_style}  (adapt your explanations accordingly)
- Current knowledge level on this topic: {topic_level}

**Requested topic/question:**
- {query}

**Current module context (if any):**
- Topic: {topic}
- Difficulty: {difficulty}
- Learning objectives: {objectives}

**Reference material from the course slides (use these as your primary
source — do NOT invent facts):**

{chunks}

**Instructions:**
1. Explain the topic clearly, tailored to the student's learning style:
   - *visual*  → use analogies, diagrams described in text, spatial metaphors
   - *auditory* → use conversational tone, mnemonics, verbal patterns
   - *reading*  → use structured text, definitions, bullet points
   - *kinesthetic* → use real-world examples, interactive thought experiments
2. Start with what the student already knows, then build upward.
3. Highlight key concepts in **bold**.
4. End with 2-3 quick comprehension check questions.
5. Keep the total length between 400-800 words.
6. If the provided reference material is insufficient for a claim, explicitly
   say what is missing instead of hallucinating.
"""


def _latest_user_message(state: AgentState) -> str:
    """Return the latest user-authored message content from session state."""
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, dict) and msg.get("role") == "user":
            return str(msg.get("content", ""))
        if isinstance(msg, HumanMessage):
            return str(msg.content)
    return ""


def _topic_label(text: str, fallback: str = "General learning request", max_len: int = 140) -> str:
    compact = " ".join((text or "").split())
    if not compact:
        return fallback
    return compact[:max_len]


def content_delivery_agent(state: AgentState) -> AgentState:
    """
    Retrieve course content and generate a personalised lesson.

    Expects:
        state["student_profile"]
        state["current_module"]  (must have "topic", "difficulty")

    Produces:
        state["retrieved_chunks"]
        state["stream_output"]   (list of streamed token strings)
    """
    profile = state.get("student_profile", {})
    module = state.get("current_module", {})
    latest_query = _latest_user_message(state).strip()
    topic = _topic_label(latest_query, fallback=module.get("topic", "General learning request"))
    retrieval_query = latest_query or module.get("topic", "") or topic
    difficulty = module.get("difficulty", "beginner")
    objectives = module.get("learning_objectives", [])
    learning_style = profile.get("learning_style", "reading")

    # Determine the student's current level on this specific topic
    knowledge_levels = profile.get("knowledge_levels", {})
    topic_info = knowledge_levels.get(topic, {})
    topic_level = topic_info.get("level", difficulty) if isinstance(topic_info, dict) else difficulty

    # ── Step 1 & 2: Retrieve relevant chunks from Pinecone ──
    chunks = retrieve_chunks(
        query=retrieval_query,
        namespace=None,
        top_k=max(1, settings.rag_top_k),
    )
    print(f"🔎 RAG query='{retrieval_query[:100]}' top_k={max(1, settings.rag_top_k)} chunks={len(chunks)}")

    if not chunks:
        state["stream_output"] = [
            "I could not find relevant material for that query in the current knowledge base. "
            "Please rephrase the question or ingest content for this topic so I can answer from grounded sources."
        ]
        state["current_agent"] = "content_delivery"
        state["retrieved_chunks"] = []
        state["current_module"] = {
            **module,
            "topic": topic,
            "difficulty": difficulty,
        }
        return state

    chunks_text = "\n\n---\n\n".join(chunks)

    # ── Step 3: Build the prompt ────────────────────────────
    messages = [
        SystemMessage(content=CONTENT_PROMPT.format(
            name=profile.get("name", "Student"),
            learning_style=learning_style,
            topic_level=topic_level,
            query=retrieval_query,
            topic=topic,
            difficulty=difficulty,
            objectives=", ".join(objectives) if objectives else "General understanding",
            chunks=chunks_text,
        )),
        HumanMessage(content=f"Please teach me about: {topic}"),
    ]

    # ── Step 4 & 5: Stream response tokens ──────────────────
    # Important: mutate state["stream_output"] as tokens arrive so the SSE
    # endpoint can stream in real-time while the graph is running.
    state["stream_output"] = []
    for chunk in llm.stream(messages):
        token = chunk.content
        if token:
            state["stream_output"].append(token)

    state["current_agent"] = "content_delivery"
    state["retrieved_chunks"] = chunks
    state["current_module"] = {
        **module,
        "topic": topic,
        "difficulty": difficulty,
    }
    return state
