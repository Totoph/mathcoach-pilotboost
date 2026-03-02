"""Auth routes — delegates to Supabase Auth."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.core.supabase import get_supabase_client, get_supabase_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str = ""


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup")
async def sign_up(req: SignUpRequest):
    try:
        supabase = get_supabase_client()
        result = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {"display_name": req.display_name}},
        })
        if result.user:
            # Create user profile in our table
            admin = get_supabase_admin()
            admin.table("profiles").insert({
                "id": result.user.id,
                "email": req.email,
                "display_name": req.display_name,
                "current_level": 0,  # 0 = needs diagnostic test
            }).execute()

            return {
                "user_id": result.user.id,
                "email": result.user.email,
                "message": "Account created. Please complete the diagnostic test.",
            }
        raise HTTPException(status_code=400, detail="Sign up failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin")
async def sign_in(req: SignInRequest):
    try:
        supabase = get_supabase_client()
        result = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })
        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "user": {
                "id": result.user.id,
                "email": result.user.email,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/signout")
async def sign_out():
    return {"message": "Sign out handled client-side by clearing tokens."}


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    try:
        supabase = get_supabase_client()
        result = supabase.auth.refresh_session(refresh_token)
        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
