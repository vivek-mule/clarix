"""
backend/api/auth_routes.py — Registration & login via Supabase Auth.

    POST /auth/register  →  creates Supabase user + blank student_profiles row
    POST /auth/login     →  authenticates and returns the Supabase JWT
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from auth.supabase_client import supabase_auth
from db.student_profile import create_profile

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Request / Response schemas ──────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    email: str


# ── Routes ──────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    """
    1. Create a new user in Supabase Auth.
    2. Insert a blank row in student_profiles with the same UUID.
    3. Return the JWT so the client is immediately authenticated.
    """
    try:
        res = supabase_auth.auth.sign_up({
            "email": body.email,
            "password": body.password,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Supabase signup failed: {e}")

    user = res.user
    session = res.session

    if not user:
        raise HTTPException(status_code=400, detail="Signup returned no user object")

    # Create blank student profile (defaults from SQL schema)
    try:
        create_profile(
            student_id=user.id,
            name=body.name,
        )
    except Exception as e:
        # Non-fatal: the user exists in auth even if profile insert fails.
        # Log and let the client retry onboarding.
        print(f"⚠  Profile insert failed for {user.id}: {e}")

    return AuthResponse(
        access_token=session.access_token if session else "",
        user_id=user.id,
        email=user.email or body.email,
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """
    Authenticate with email + password via Supabase Auth.
    Returns the JWT access token.
    """
    try:
        res = supabase_auth.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {e}")

    user = res.user
    session = res.session

    if not user or not session:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return AuthResponse(
        access_token=session.access_token,
        user_id=user.id,
        email=user.email or body.email,
    )
