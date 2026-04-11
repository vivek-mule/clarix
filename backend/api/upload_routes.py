"""
backend/api/upload_routes.py — PDF upload, document listing, summary & roadmap generation.

Endpoints:
    POST /upload/pdf                        → upload & ingest a PDF into Pinecone
    GET  /upload/documents                  → list uploaded documents for the student
    GET  /upload/document/{doc_id}          → get a single document record
    POST /upload/document/{doc_id}/summary  → generate / regenerate summary + roadmap
"""

from __future__ import annotations

import re
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

import pdfplumber
from pypdf import PdfReader

from auth.jwt_dependency import get_current_user_id
from config import settings
from rag.embedder import get_embeddings
from rag.pinecone_client import upsert_vectors, query_vectors
from db.uploaded_documents import (
    create_document,
    get_document,
    list_documents,
    update_document,
)

router = APIRouter(prefix="/upload", tags=["Upload"])


# ── Helpers ─────────────────────────────────────────────────

def _sanitize_slug(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", Path(text).stem)
    return slug.strip("_").lower()[:60]


def _compact(value: str) -> str:
    return " ".join((value or "").split())


def _table_to_text(table: list[list[str | None]]) -> str:
    lines: list[str] = []
    for row in table or []:
        cells = [_compact(str(c)) if c is not None else "" for c in (row or [])]
        if any(cells):
            lines.append(" | ".join(cells))
    return "\n".join(lines)


def _topic_from_text(text: str, fallback: str) -> str:
    for line in (text or "").splitlines():
        line = line.strip()
        if line:
            return line[:120]
    return fallback


def _infer_difficulty(page_index: int, total_pages: int) -> str:
    ratio = page_index / max(total_pages, 1)
    if ratio < 0.33:
        return "beginner"
    if ratio < 0.66:
        return "intermediate"
    return "advanced"


def _extract_pages(filepath: Path) -> list[dict]:
    """Extract text per page using pdfplumber with pypdf fallback."""
    reader = PdfReader(str(filepath))
    total_pages = len(reader.pages)

    plumber_texts: list[str] = []
    try:
        with pdfplumber.open(str(filepath)) as pdf:
            for page in pdf.pages:
                parts: list[str] = []
                body = (page.extract_text() or "").strip()
                if body:
                    parts.append(body)
                for t_idx, table in enumerate(page.extract_tables() or [], 1):
                    tt = _table_to_text(table)
                    if tt:
                        parts.append(f"[Table {t_idx}]\n{tt}")
                plumber_texts.append("\n\n".join(parts).strip())
    except Exception:
        plumber_texts = [""] * total_pages

    while len(plumber_texts) < total_pages:
        plumber_texts.append("")

    pages: list[dict] = []
    for idx in range(total_pages):
        text = plumber_texts[idx]
        if not text:
            try:
                text = (reader.pages[idx].extract_text() or "").strip()
            except Exception:
                text = ""
        if not text:
            continue

        pages.append({
            "page": idx + 1,
            "text": text,
            "topic": _topic_from_text(text, f"Page {idx + 1}"),
            "difficulty": _infer_difficulty(idx, total_pages),
        })

    return pages


# ── Response schemas ────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    student_id: str
    filename: str
    namespace: str
    page_count: int
    vector_count: int
    summary: str | None = None
    roadmap: dict | None = None
    created_at: str


# ── POST /upload/pdf ────────────────────────────────────────

@router.post("/pdf", response_model=DocumentResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    student_id: str = Depends(get_current_user_id),
):
    """Upload a PDF, extract text, embed, upsert to Pinecone, save metadata."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files are accepted")

    # Read the file
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        # Extract text per page
        pages = _extract_pages(tmp_path)
        if not pages:
            raise HTTPException(status_code=400, detail="No extractable text found in the PDF")

        # Build namespace
        sid_short = student_id.replace("-", "")[:12]
        file_slug = _sanitize_slug(file.filename)
        namespace = f"{sid_short}_{file_slug}"

        # Embed
        texts = [p["text"] for p in pages]
        embeddings = get_embeddings(texts)

        # Build vectors
        vectors = []
        for page_data, emb in zip(pages, embeddings):
            vid = f"{file_slug}_page{page_data['page']}"
            vectors.append({
                "id": vid,
                "values": emb,
                "metadata": {
                    "source": file.filename,
                    "page": page_data["page"],
                    "topic": page_data["topic"],
                    "difficulty": page_data["difficulty"],
                    "subject": namespace,
                    "text": page_data["text"][:40_000],
                },
            })

        # Upsert to Pinecone
        upserted = upsert_vectors(vectors=vectors, namespace=namespace, batch_size=50)

        # Generate summary + roadmap via Gemini
        summary, roadmap = _generate_summary_and_roadmap(pages, file.filename)

        # Save to DB
        doc = create_document(
            student_id=student_id,
            filename=file.filename,
            namespace=namespace,
            page_count=len(pages),
            vector_count=upserted,
            summary=summary,
            roadmap=roadmap,
        )

        return DocumentResponse(
            id=doc.get("id", ""),
            student_id=doc.get("student_id", student_id),
            filename=doc.get("filename", file.filename),
            namespace=doc.get("namespace", namespace),
            page_count=doc.get("page_count", len(pages)),
            vector_count=doc.get("vector_count", upserted),
            summary=doc.get("summary"),
            roadmap=doc.get("roadmap"),
            created_at=str(doc.get("created_at", "")),
        )
    finally:
        tmp_path.unlink(missing_ok=True)


# ── GET /upload/documents ───────────────────────────────────

@router.get("/documents", response_model=list[DocumentResponse])
async def get_documents(student_id: str = Depends(get_current_user_id)):
    """List all uploaded documents for the authenticated student."""
    rows = list_documents(student_id=student_id)
    return [
        DocumentResponse(
            id=r.get("id", ""),
            student_id=r.get("student_id", ""),
            filename=r.get("filename", ""),
            namespace=r.get("namespace", ""),
            page_count=r.get("page_count", 0),
            vector_count=r.get("vector_count", 0),
            summary=r.get("summary"),
            roadmap=r.get("roadmap"),
            created_at=str(r.get("created_at", "")),
        )
        for r in rows
    ]


# ── GET /upload/document/{doc_id} ───────────────────────────

@router.get("/document/{doc_id}", response_model=DocumentResponse)
async def get_document_detail(
    doc_id: str,
    student_id: str = Depends(get_current_user_id),
):
    """Get a single document's details."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.get("student_id") != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return DocumentResponse(
        id=doc.get("id", ""),
        student_id=doc.get("student_id", ""),
        filename=doc.get("filename", ""),
        namespace=doc.get("namespace", ""),
        page_count=doc.get("page_count", 0),
        vector_count=doc.get("vector_count", 0),
        summary=doc.get("summary"),
        roadmap=doc.get("roadmap"),
        created_at=str(doc.get("created_at", "")),
    )


# ── POST /upload/document/{doc_id}/summary ──────────────────

@router.post("/document/{doc_id}/summary", response_model=DocumentResponse)
async def regenerate_summary(
    doc_id: str,
    student_id: str = Depends(get_current_user_id),
):
    """Regenerate summary + roadmap for a document using its Pinecone vectors."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.get("student_id") != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    namespace = doc.get("namespace", "")

    # Retrieve stored text from Pinecone using a broad query
    from rag.embedder import get_embedding
    dummy_vec = get_embedding("summarize all topics and content")
    matches = query_vectors(
        vector=dummy_vec,
        namespace=namespace,
        top_k=100,
        include_metadata=True,
    )

    pages = []
    for m in sorted(matches, key=lambda x: x.get("metadata", {}).get("page", 0)):
        meta = m.get("metadata", {})
        text = meta.get("text", "")
        if text:
            pages.append({
                "page": meta.get("page", 0),
                "text": text,
                "topic": meta.get("topic", ""),
                "difficulty": meta.get("difficulty", ""),
            })

    if not pages:
        raise HTTPException(status_code=400, detail="No content found in vector store")

    summary, roadmap = _generate_summary_and_roadmap(pages, doc.get("filename", ""))

    updated = update_document(doc_id, {"summary": summary, "roadmap": roadmap})
    result = updated or doc
    result["summary"] = summary
    result["roadmap"] = roadmap

    return DocumentResponse(
        id=result.get("id", ""),
        student_id=result.get("student_id", ""),
        filename=result.get("filename", ""),
        namespace=result.get("namespace", ""),
        page_count=result.get("page_count", 0),
        vector_count=result.get("vector_count", 0),
        summary=result.get("summary"),
        roadmap=result.get("roadmap"),
        created_at=str(result.get("created_at", "")),
    )


# ── Summary + Roadmap generation helper ─────────────────────

def _generate_summary_and_roadmap(
    pages: list[dict],
    filename: str,
) -> tuple[str, dict]:
    """Use Gemini to generate a summary and a branched learning roadmap."""
    import json
    from langchain_core.messages import HumanMessage, SystemMessage
    from agents.llm import llm

    # Combine page text (truncate to fit context)
    all_text = "\n\n---\n\n".join(
        f"[Page {p['page']}]\n{p['text'][:3000]}" for p in pages[:50]
    )

    # ── Summary ─────────────────────────────────────────────
    summary_prompt = f"""\
You are a concise academic summarizer. Read the following document content
extracted from "{filename}" and produce a clear, well-structured summary.

Requirements:
- 300-500 words
- Use markdown formatting (headings, bold, bullet points)
- Highlight the main topics, key concepts, and important takeaways
- Organize by themes or sections found in the document

Document content:
{all_text[:30000]}
"""

    summary_resp = llm.invoke([
        SystemMessage(content="You are a helpful academic assistant."),
        HumanMessage(content=summary_prompt),
    ])
    summary = summary_resp.content.strip()

    # ── Roadmap ─────────────────────────────────────────────
    roadmap_prompt = f"""\
Based on the following document content from "{filename}", create a learning
roadmap that shows the optimal order and relationships between topics.

Return ONLY valid JSON in this exact format (no markdown code fences, no explanation):
{{
  "nodes": [
    {{"id": "1", "label": "Topic Name", "description": "Brief 1-sentence description"}},
    ...
  ],
  "edges": [
    {{"source": "1", "target": "2"}},
    ...
  ]
}}

Rules:
- Extract 6-15 distinct topics/concepts from the document
- Create edges showing prerequisite relationships (what should be learned before what)
- The first node should be the most foundational topic
- Create BRANCHING paths where topics can be learned in parallel
- Make it a DAG (directed acyclic graph) — no cycles
- Each node id should be a simple string number ("1", "2", etc.)

Document content:
{all_text[:25000]}
"""

    roadmap_resp = llm.invoke([
        SystemMessage(content="You are a curriculum design expert. Return only valid JSON."),
        HumanMessage(content=roadmap_prompt),
    ])

    roadmap_text = roadmap_resp.content.strip()
    # Strip markdown code fences if present
    if roadmap_text.startswith("```"):
        lines = roadmap_text.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        roadmap_text = "\n".join(lines)

    try:
        roadmap = json.loads(roadmap_text)
    except json.JSONDecodeError:
        # Fallback: simple linear roadmap from page topics
        unique_topics = []
        seen = set()
        for p in pages:
            t = p.get("topic", "")
            if t and t not in seen:
                seen.add(t)
                unique_topics.append(t)
            if len(unique_topics) >= 10:
                break

        roadmap = {
            "nodes": [
                {"id": str(i + 1), "label": t, "description": ""}
                for i, t in enumerate(unique_topics)
            ],
            "edges": [
                {"source": str(i + 1), "target": str(i + 2)}
                for i in range(len(unique_topics) - 1)
            ],
        }

    return summary, roadmap
