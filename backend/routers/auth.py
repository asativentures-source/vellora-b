"""/api/auth/* — Google OAuth + JWT email/password + settings."""
import httpx
import jwt
import secrets
from fastapi import APIRouter, HTTPException, Request, Response, Depends, Cookie
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from deps import (
    db, logger, uid, now_iso, hash_password, verify_password,
    create_access_token, create_refresh_token,
    persist_refresh_jti, revoke_refresh_jti, revoke_all_refresh_for_user,
    set_auth_cookies, clear_auth_cookies, issue_tokens_and_set,
    get_current_user, require_fresh_auth,
    JWT_SECRET, JWT_ALG, ACCESS_TTL_MIN,
)

router = APIRouter(prefix="/auth")

# ---------- Google OAuth ----------
class SessionRequest(BaseModel):
    session_id: str

@router.post("/session")
async def create_session(payload: SessionRequest, response: Response):
    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data["email"]
    name = data.get("name", email)
    picture = data.get("picture", "")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login": now_iso(), "last_auth_at": now_iso()}},
        )
    else:
        user_id = uid("user")
        role = "patient"
        if email.startswith("dr.") or "@doctors." in email:
            role = "doctor"
        if await db.users.count_documents({}) == 0:
            role = "admin"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "created_at": now_iso(),
            "last_login": now_iso(),
            "last_auth_at": now_iso(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_iso(),
    })
    response.set_cookie(
        key="session_token", value=session_token, max_age=7 * 86400,
        httponly=True, secure=True, samesite="none", path="/",
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user, "session_token": session_token}


# ---------- Common ----------
@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user

@router.post("/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    rt = request.cookies.get("refresh_token")
    if rt:
        try:
            payload = jwt.decode(rt, JWT_SECRET, algorithms=[JWT_ALG], options={"verify_exp": False})
            jti = payload.get("jti")
            if jti:
                await revoke_refresh_jti(jti)
        except jwt.InvalidTokenError:
            pass
    clear_auth_cookies(response)
    return {"ok": True}


# ---------- Email/Password ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    name: str = Field(min_length=1, max_length=120)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotRequest(BaseModel):
    email: EmailStr

class ResetRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=200)

class AddPasswordRequest(BaseModel):
    password: str = Field(min_length=8, max_length=200)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=200)


async def _check_brute_force(identifier: str):
    now = datetime.now(timezone.utc)
    doc = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if not doc:
        return
    if doc.get("locked_until"):
        lu = doc["locked_until"]
        if isinstance(lu, str):
            lu = datetime.fromisoformat(lu)
        if lu.tzinfo is None:
            lu = lu.replace(tzinfo=timezone.utc)
        if lu > now:
            raise HTTPException(429, "Too many attempts. Try again in a few minutes.")

async def _record_fail(identifier: str):
    now = datetime.now(timezone.utc)
    doc = await db.login_attempts.find_one_and_update(
        {"identifier": identifier},
        {"$inc": {"count": 1}, "$set": {"last_at": now.isoformat()}},
        upsert=True, return_document=True,
    )
    count = int((doc or {}).get("count", 1))
    if count >= 5:
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$set": {"locked_until": (now + timedelta(minutes=15)).isoformat(), "count": 0}},
        )

async def _clear_fail(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


@router.post("/register")
async def register(payload: RegisterRequest, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        if existing.get("password_hash"):
            raise HTTPException(409, "An account with this email already exists. Please sign in.")
        raise HTTPException(
            409,
            "This email is already registered via Google. Please sign in with Google, then add a password from settings.",
        )

    role = "patient"
    if email.startswith("dr.") or "@doctors." in email:
        role = "doctor"
    if await db.users.count_documents({}) == 0:
        role = "admin"

    hashed = hash_password(payload.password)
    user_id = uid("user")
    await db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": payload.name,
        "picture": "",
        "role": role,
        "password_hash": hashed,
        "created_at": now_iso(),
        "last_login": now_iso(),
        "last_auth_at": now_iso(),
    })
    await issue_tokens_and_set(response, user_id, email)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user}


@router.post("/login")
async def login(payload: LoginRequest, request: Request, response: Response):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    await _check_brute_force(identifier)

    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        await _record_fail(identifier)
        raise HTTPException(401, "Invalid email or password.")
    if not verify_password(payload.password, user["password_hash"]):
        await _record_fail(identifier)
        raise HTTPException(401, "Invalid email or password.")

    await _clear_fail(identifier)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"last_login": now_iso()}})
    await issue_tokens_and_set(response, user["user_id"], email)
    safe = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"user": safe}


@router.post("/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(rt, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")

    old_jti = payload.get("jti")
    user_id = payload["sub"]

    active = await db.refresh_sessions.find_one({"jti": old_jti, "user_id": user_id})
    if not active:
        logger.warning(
            f"Refresh token reuse detected user_id={user_id} jti={old_jti} — revoking all sessions"
        )
        await revoke_all_refresh_for_user(user_id)
        clear_auth_cookies(response)
        raise HTTPException(401, "Refresh token reused or revoked. Please sign in again.")

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        await revoke_refresh_jti(old_jti)
        raise HTTPException(401, "User not found")

    # NOTE: /refresh rotates tokens but does NOT update last_auth_at — that
    # would defeat require_fresh_auth. Fresh-auth is anchored to actual sign-in.
    await revoke_refresh_jti(old_jti)
    new_access = create_access_token(user_id, user["email"])
    new_refresh, new_jti = create_refresh_token(user_id)
    await persist_refresh_jti(user_id, new_jti)
    set_auth_cookies(response, new_access, new_refresh)
    return {"ok": True}


@router.post("/forgot-password")
async def forgot_password(payload: ForgotRequest):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user and user.get("password_hash"):
        token = secrets.token_urlsafe(32)
        exp = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["user_id"],
            "email": email,
            "used": False,
            "expires_at": exp,          # native datetime for TTL index
            "expires_at_iso": exp.isoformat(),
            "created_at": now_iso(),
        })
        logger.info(f"[PASSWORD RESET] link for {email}: /reset-password?token={token}")
    return {"ok": True, "message": "If an account exists, a reset link was sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetRequest):
    rec = await db.password_reset_tokens.find_one({"token": payload.token, "used": False}, {"_id": 0})
    if not rec:
        raise HTTPException(400, "Invalid or expired reset token.")
    exp = rec.get("expires_at") or rec.get("expires_at_iso")
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(400, "Reset token has expired.")
    new_hash = hash_password(payload.password)
    await db.users.update_one({"user_id": rec["user_id"]}, {"$set": {"password_hash": new_hash}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    await revoke_all_refresh_for_user(rec["user_id"])
    return {"ok": True, "message": "Password updated. Please sign in."}


@router.post("/add-password")
async def add_password(payload: AddPasswordRequest, response: Response, user=Depends(require_fresh_auth)):
    """For users signed in via Google (no password_hash). Requires a *fresh*
    authenticated session (see FRESH_AUTH_WINDOW_MIN in deps.py)."""
    full = await db.users.find_one({"user_id": user["user_id"]})
    if not full:
        raise HTTPException(404, "User not found")
    if full.get("password_hash"):
        raise HTTPException(409, "You already have a password. Use 'Change password' instead.")
    hashed = hash_password(payload.password)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": hashed}})
    await issue_tokens_and_set(response, user["user_id"], user["email"])
    logger.info(f"Password attached to Google account user_id={user['user_id']}")
    return {"ok": True, "message": "Password set. You can now sign in with email + password."}


@router.post("/change-password")
async def change_password(payload: ChangePasswordRequest, user=Depends(get_current_user)):
    full = await db.users.find_one({"user_id": user["user_id"]})
    if not full or not full.get("password_hash"):
        raise HTTPException(400, "No password is set for this account. Use 'Add password' instead.")
    if not verify_password(payload.current_password, full["password_hash"]):
        raise HTTPException(401, "Current password is incorrect.")
    new_hash = hash_password(payload.new_password)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": new_hash}})
    await revoke_all_refresh_for_user(user["user_id"])
    return {"ok": True, "message": "Password changed. Other sessions were signed out."}


@router.get("/security")
async def security_state(user=Depends(get_current_user)):
    from deps import FRESH_AUTH_WINDOW_MIN, _to_aware  # local to avoid unused imports elsewhere
    full = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    active_sessions = await db.refresh_sessions.count_documents({"user_id": user["user_id"]})
    google_sessions = await db.user_sessions.count_documents({"user_id": user["user_id"]})
    fresh = False
    if full and full.get("last_auth_at"):
        try:
            fresh = datetime.now(timezone.utc) - _to_aware(full["last_auth_at"]) <= timedelta(minutes=FRESH_AUTH_WINDOW_MIN)
        except Exception:
            fresh = False
    return {
        "has_password": bool(full and full.get("password_hash")),
        "has_google": bool(full and full.get("picture")),
        "active_refresh_sessions": active_sessions,
        "active_google_sessions": google_sessions,
        "fresh_auth": fresh,
        "fresh_auth_window_min": FRESH_AUTH_WINDOW_MIN,
    }
