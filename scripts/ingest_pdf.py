"""
scripts/ingest_pdf.py — One-time offline ingestion of PDF documents into Pinecone.

What this does:
    - extracts body text per page
    - extracts table-like content per page (via pdfplumber)
    - falls back to pypdf extraction if needed
    - treats each page as one chunk
    - embeds locally with all-MiniLM-L6-v2 (384-dim)
    - upserts with deterministic IDs for idempotent re-runs

Usage:
    # Single file
    python scripts/ingest_pdf.py --path slides/nlp_book.pdf --namespace nlp

    # Entire folder (processes every .pdf inside)
    python scripts/ingest_pdf.py --path slides/ --namespace nlp
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# ── Ensure backend package is importable ─────────────────────
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import pdfplumber  # noqa: E402
from pypdf import PdfReader  # noqa: E402

from rag.embedder import get_embeddings  # noqa: E402
from rag.pinecone_client import upsert_vectors  # noqa: E402
from config import settings  # noqa: E402

UPSERT_BATCH_SIZE = 50


def _sanitize_id(text: str) -> str:
    stem = Path(text).stem
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", stem)
    return slug.strip("_").lower()


def _infer_difficulty(page_index: int, total_pages: int) -> str:
    ratio = page_index / max(total_pages, 1)
    if ratio < 0.33:
        return "beginner"
    if ratio < 0.66:
        return "intermediate"
    return "advanced"


def _topic_from_text(text: str, fallback: str) -> str:
    """
    Heuristic: pick the first non-empty line as the 'topic' for metadata.
    """
    for line in (text or "").splitlines():
        line = line.strip()
        if line:
            return line[:120]
    return fallback


def _compact(value: str) -> str:
    return " ".join((value or "").split())


def _table_to_text(table: list[list[str | None]]) -> str:
    """
    Convert a table matrix into a pipe-delimited text block.
    This makes table rows retrievable by embeddings.
    """
    lines: list[str] = []
    for row in table or []:
        cells = [_compact(str(cell)) if cell is not None else "" for cell in (row or [])]
        if any(cells):
            lines.append(" | ".join(cells))
    return "\n".join(lines)


def _extract_with_pdfplumber(pdf_path: Path) -> list[tuple[str, int]]:
    """
    Return per-page tuples: (combined_text, extracted_table_count).
    """
    pages: list[tuple[str, int]] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            parts: list[str] = []

            body = (page.extract_text() or "").strip()
            if body:
                parts.append(body)

            raw_tables = page.extract_tables() or []
            table_blocks: list[str] = []
            for t_idx, table in enumerate(raw_tables, start=1):
                table_text = _table_to_text(table)
                if table_text:
                    table_blocks.append(f"[Table {t_idx}]\n{table_text}")

            if table_blocks:
                parts.append("[Extracted tables]\n" + "\n\n".join(table_blocks))

            pages.append(("\n\n".join(parts).strip(), len(table_blocks)))
    return pages


def _extract_with_pypdf(reader: PdfReader, page_index: int) -> str:
    try:
        return (reader.pages[page_index].extract_text() or "").strip()
    except Exception:
        return ""


def process_pdf(filepath: Path, namespace: str) -> int:
    filename = filepath.name
    file_slug = _sanitize_id(filename)
    namespace = namespace.strip().lower()

    print(f"\n{'━' * 60}")
    print(f"📄  Processing: {filename}")
    print(f"    Namespace:  {namespace}")
    print(f"    Pinecone index: {settings.pinecone_index_name}")
    print(f"{'━' * 60}")

    reader = PdfReader(str(filepath))
    total_pages = len(reader.pages)

    plumber_pages: list[tuple[str, int]] = []
    try:
        plumber_pages = _extract_with_pdfplumber(filepath)
    except Exception as e:
        print(f"    ⚠  pdfplumber extraction failed ({e}); using pypdf fallback only")
        plumber_pages = [("", 0)] * total_pages

    if len(plumber_pages) < total_pages:
        plumber_pages.extend([("", 0)] * (total_pages - len(plumber_pages)))

    chunks: list[dict] = []
    skipped = 0

    for idx in range(1, total_pages + 1):
        text, table_count = plumber_pages[idx - 1]
        if not text:
            text = _extract_with_pypdf(reader, idx - 1)

        if not text:
            print(f"    ⚠  Page {idx}/{total_pages} — no text, skipping")
            skipped += 1
            continue

        vector_id = f"{file_slug}_page{idx}"
        difficulty = _infer_difficulty(idx, total_pages)
        topic = _topic_from_text(text, fallback=f"Page {idx}")

        metadata = {
            "source": filename,
            "page": idx,
            "topic": topic,
            "difficulty": difficulty,
            "subject": namespace,
            "table_count": table_count,
            "text": text[:40_000],
        }

        chunks.append({"id": vector_id, "text": text, "metadata": metadata})
        print(f"    ✔  Page {idx}/{total_pages}  id={vector_id}  chars={len(text)}  tables={table_count}")

    if not chunks:
        print(f"    ⛔  No vectors to upsert from {filename}")
        return 0

    print(f"\n    🧠  Embedding {len(chunks)} page(s) locally …")
    texts = [c["text"] for c in chunks]
    embeddings = get_embeddings(texts)

    vectors = [
        {"id": c["id"], "values": emb, "metadata": c["metadata"]}
        for c, emb in zip(chunks, embeddings)
    ]

    print(f"    📤  Upserting to Pinecone …")
    # Use backend helper (handles batch upserts + namespace)
    upserted = upsert_vectors(vectors=vectors, namespace=namespace, batch_size=UPSERT_BATCH_SIZE)
    print(f"\n    ✅  Done — {upserted} upserted, {skipped} skipped")
    return upserted


def main():
    parser = argparse.ArgumentParser(description="Ingest .pdf slide decks into Pinecone.")
    parser.add_argument("--path", required=True, help="Path to a single .pdf OR a folder containing .pdf files.")
    parser.add_argument("--namespace", required=False, help="Pinecone namespace (e.g. nlp).")
    parser.add_argument("--subject", required=False, help=argparse.SUPPRESS)
    args = parser.parse_args()

    namespace = (args.namespace or args.subject or "").strip().lower()
    if not namespace:
        print("❌  Provide --namespace (or legacy --subject)")
        sys.exit(1)

    target = Path(args.path).resolve()
    if target.is_file():
        if target.suffix.lower() != ".pdf":
            print(f"❌  {target} is not a .pdf file")
            sys.exit(1)
        files = [target]
    elif target.is_dir():
        files = sorted(target.glob("*.pdf"))
        if not files:
            print(f"❌  No .pdf files found in {target}")
            sys.exit(1)
    else:
        print(f"❌  Path does not exist: {target}")
        sys.exit(1)

    print(f"🚀  Found {len(files)} .pdf file(s) to process")
    total = 0
    for f in files:
        try:
            total += process_pdf(f, namespace)
        except Exception as e:
            print(f"\n    ❌  Error processing {f.name}: {e}")
            continue

    print(f"\n{'━' * 60}")
    print(f"🏁  All done — {total} total vectors upserted across {len(files)} file(s)")
    print(f"{'━' * 60}")


if __name__ == "__main__":
    main()

