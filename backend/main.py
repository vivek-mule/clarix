"""
backend/main.py — FastAPI application entry point.

Startup flow:
    1. Load settings from .env
    2. Warm up the embedding model singleton (first-import load)
    3. Mount CORS middleware
    4. Include all API routers

Run:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings


# ── Lifespan (startup / shutdown) ───────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once on startup:
      • Imports rag.embedder, which loads the all-MiniLM-L6-v2 model
        into memory so the first real request doesn't pay the cold-start
        penalty (~2-3 s model download/load).
    """
    print("🚀  Starting Adaptive Learning Platform API …")

    # Warm up the embedding model singleton
    print("🧠  Loading embedding model (all-MiniLM-L6-v2) …")
    from rag.embedder import get_embedding  # noqa: F401 — triggers model load
    _warmup = get_embedding("warmup")
    print(f"    ✔  Model loaded — warmup vector dim = {len(_warmup)}")

    print("✅  Ready to accept requests\n")
    yield
    print("👋  Shutting down …")


# ── App factory ─────────────────────────────────────────────

app = FastAPI(
    title="Adaptive Learning Platform API",
    description="AI-powered adaptive learning backend — Gemini + LangGraph + RAG",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────
from api.auth_routes import router as auth_router        # noqa: E402
from api.student_routes import router as student_router  # noqa: E402
from api.agent_routes import router as agent_router      # noqa: E402

app.include_router(auth_router)
app.include_router(student_router)
app.include_router(agent_router)


# ── Health check ────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "adaptive-learning-api"}
