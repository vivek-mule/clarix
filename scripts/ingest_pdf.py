"""
scripts/ingest_pdf.py — One-time offline ingestion of PDF slide decks into Pinecone.

Why this exists:
  Your course slides are currently in .pdf format (not .pptx). This script:
    - extracts text per page
    - treats each page as one chunk (similar to "1 slide = 1 chunk")
    - embeds locally with all-MiniLM-L6-v2 (384-dim)
    - upserts into Pinecone using deterministic IDs so re-runs are idempotent

Usage:
  # Single file
  python scripts/ingest_pdf.py --path slides/physics_ch1.pdf --subject physics

  # Entire folder (processes every .pdf inside)
  python scripts/ingest_pdf.py --path slides/ --subject physics
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# ── Ensure backend package is importable ─────────────────────
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

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


def process_pdf(filepath: Path, subject: str) -> int:
    filename = filepath.name
    file_slug = _sanitize_id(filename)
    namespace = subject.strip().lower()

    print(f"\n{'━' * 60}")
    print(f"📄  Processing: {filename}")
    print(f"    Namespace:  {namespace}")
    print(f"    Pinecone index: {settings.pinecone_index_name}")
    print(f"{'━' * 60}")

    reader = PdfReader(str(filepath))
    total_pages = len(reader.pages)

    chunks: list[dict] = []
    skipped = 0

    for idx, page in enumerate(reader.pages, start=1):
        try:
            text = (page.extract_text() or "").strip()
        except Exception:
            text = ""

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
            "text": text[:40_000],
        }

        chunks.append({"id": vector_id, "text": text, "metadata": metadata})
        print(f"    ✔  Page {idx}/{total_pages}  id={vector_id}  chars={len(text)}")

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
    parser.add_argument("--subject", required=True, help="Pinecone namespace (e.g. physics, math).")
    args = parser.parse_args()

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
            total += process_pdf(f, args.subject)
        except Exception as e:
            print(f"\n    ❌  Error processing {f.name}: {e}")
            continue

    print(f"\n{'━' * 60}")
    print(f"🏁  All done — {total} total vectors upserted across {len(files)} file(s)")
    print(f"{'━' * 60}")


if __name__ == "__main__":
    main()

