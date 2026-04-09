"""
backend/auth/jwt_dependency.py — FastAPI dependency that verifies Supabase JWTs.

Usage in a route:
    from auth.jwt_dependency import get_current_user_id

    @router.get("/me")
    def me(student_id: str = Depends(get_current_user_id)):
        ...
"""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from auth.supabase_client import supabase_auth
from config import settings

_bearer_scheme = HTTPBearer()

# Supabase JWTs use HS256 with the project's JWT secret.
ALGORITHM = "HS256"


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _extract_user_id_from_hs_token(token: str) -> str:
    """
    Legacy Supabase projects may still issue HS-signed JWTs.
    Verify those locally using SUPABASE_JWT_SECRET.
    """
    payload = jwt.decode(
        token,
        settings.supabase_jwt_secret,
        algorithms=[ALGORITHM],
        options={"verify_aud": False},
    )
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise _unauthorized("Token payload missing 'sub' claim")
    return user_id


def _extract_user_id_from_supabase(token: str) -> str:
    """
    Modern Supabase projects use asymmetric signing keys (e.g. RS256).
    Validate with Supabase Auth API and read the user id from the response.
    """
    user_response = supabase_auth.auth.get_user(jwt=token)
    user = user_response.user if user_response else None
    user_id = getattr(user, "id", None)
    if not user_id:
        raise _unauthorized("Invalid or expired token")
    return user_id


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
        header = jwt.get_unverified_header(token)
        alg = str(header.get("alg", "")).upper()
    except JWTError:
        raise _unauthorized("Invalid token header")

    # Legacy path: HS256 signed access token.
    if alg == ALGORITHM:
        try:
            return _extract_user_id_from_hs_token(token)
        except JWTError:
            # Secret may be misconfigured locally; ask Supabase to validate token.
            try:
                return _extract_user_id_from_supabase(token)
            except HTTPException:
                raise
            except Exception:
                raise _unauthorized("Invalid or expired token")

    # Modern Supabase path: asymmetric signing keys (RS256/others).
    try:
        return _extract_user_id_from_supabase(token)
    except HTTPException:
        raise
    except Exception:
        raise _unauthorized("Invalid or expired token")
