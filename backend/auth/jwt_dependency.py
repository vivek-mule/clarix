"""
backend/auth/jwt_dependency.py — FastAPI dependency that verifies Supabase JWTs.

Usage in a route:
    from auth.jwt_dependency import get_current_user_id

    @router.get("/me")
    def me(student_id: str = Depends(get_current_user_id)):
        ...
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from config import settings

_bearer_scheme = HTTPBearer()

# Supabase JWTs use HS256 with the project's JWT secret.
ALGORITHM = "HS256"


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """
    Extracts and verifies the Supabase JWT from the Authorization header.
    Returns the authenticated user's UUID (the ``sub`` claim).

    Raises 401 if the token is missing, expired, or invalid.
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=[ALGORITHM],
            options={"verify_aud": False},  # Supabase tokens use "authenticated"
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing 'sub' claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id
