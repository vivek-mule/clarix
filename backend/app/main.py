"""
Adaptive Learning Platform — FastAPI Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title="Adaptive Learning Platform API",
    version="0.1.0",
    description="AI-powered adaptive learning backend with LangGraph agents",
)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Root health-check ───────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok"}


# ── Register routers (uncomment as you build them) ──────────
# from app.api import auth, learning, assessment, chat
# app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
# app.include_router(learning.router,   prefix="/api/learning",   tags=["Learning"])
# app.include_router(assessment.router, prefix="/api/assessment", tags=["Assessment"])
# app.include_router(chat.router,       prefix="/api/chat",       tags=["Chat"])
