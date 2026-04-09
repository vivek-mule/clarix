"""
Auth routes — signup / login / session via Supabase Auth.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.supabase_client import supabase

router = APIRouter()


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup")
async def signup(body: AuthRequest):
    try:
        res = supabase.auth.sign_up({"email": body.email, "password": body.password})
        return {"user": res.user, "session": res.session}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(body: AuthRequest):
    try:
        res = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
        return {"user": res.user, "session": res.session}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout():
    supabase.auth.sign_out()
    return {"message": "logged out"}
