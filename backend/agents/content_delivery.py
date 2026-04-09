"""
agents/content_delivery.py — Personalised content delivery agent.

1. Embeds the current module topic locally (all-MiniLM-L6-v2)
2. Queries Pinecone via rag/retriever.py for relevant course chunks
3. Sends retrieved chunks + student profile to Gemini
4. Generates a personalised explanation adapted to learning_style
5. Streams response tokens into state["stream_output"]
"""

from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from agents.state import AgentState
from agents.llm import llm
from rag.retriever import retrieve_chunks


CONTENT_PROMPT = """\
You are an expert {subject} tutor delivering a lesson.

**Student profile:**
- Name: {name}
- Learning style: {learning_style}  (adapt your explanations accordingly)
- Current knowledge level on this topic: {topic_level}

**Module being taught:**
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
"""


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
    subject = profile.get("subject", "general")
    topic = module.get("topic", "unknown")
    difficulty = module.get("difficulty", "beginner")
    objectives = module.get("learning_objectives", [])
    learning_style = profile.get("learning_style", "reading")

    # Determine the student's current level on this specific topic
    knowledge_levels = profile.get("knowledge_levels", {})
    topic_info = knowledge_levels.get(topic, {})
    topic_level = topic_info.get("level", difficulty) if isinstance(topic_info, dict) else difficulty

    # ── Step 1 & 2: Retrieve relevant chunks from Pinecone ──
    chunks = retrieve_chunks(
        query=topic,
        namespace=subject,
        top_k=5,
    )

    chunks_text = "\n\n---\n\n".join(chunks) if chunks else "(No course material found — teach from your own knowledge.)"

    # ── Step 3: Build the prompt ────────────────────────────
    messages = [
        SystemMessage(content=CONTENT_PROMPT.format(
            subject=subject,
            name=profile.get("name", "Student"),
            learning_style=learning_style,
            topic_level=topic_level,
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
    return state
