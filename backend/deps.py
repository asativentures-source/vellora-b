"""Shared dependencies: database, config, auth, crypto helpers."""
import os
import logging
import uuid
import bcrypt
import jwt
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import HTTPException, Request, Response, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------- Config ----------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
_cors_env = os.environ.get('CORS_ORIGINS', '*')
# split, strip and remove empty entries
CORS_ORIGINS = [o.strip() for o in _cors_env.split(',') if o.strip()]
# if nothing supplied, fall back to wildcard
if not CORS_ORIGINS:
    CORS_ORIGINS = ['*']

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
ACCESS_TTL_MIN = 60 * 12       # 12h
REFRESH_TTL_DAYS = 30
FRESH_AUTH_WINDOW_MIN = 10     # /auth/add-password requires auth within this window
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").lower().strip()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("verdia")

# ---------- Database ----------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ---------- Small helpers ----------
def uid(prefix: str = "id") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _to_aware(dt):
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

# ---------- Password ----------
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

# ---------- JWT ----------
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def create_refresh_token(user_id: str, jti: Optional[str] = None):
    """Returns (token, jti). Rotated on every /auth/refresh."""
    jti = jti or uid("rjti")
    payload = {
        "sub": user_id,
        "type": "refresh",
        "jti": jti,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG), jti

async def persist_refresh_jti(user_id: str, jti: str):
    exp_dt = datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS)
    await db.refresh_sessions.insert_one({
        "jti": jti,
        "user_id": user_id,
        "created_at": now_iso(),
        "expires_at": exp_dt,          # native datetime for TTL index
        "expires_at_iso": exp_dt.isoformat(),
    })

async def revoke_refresh_jti(jti: str):
    await db.refresh_sessions.delete_one({"jti": jti})

async def revoke_all_refresh_for_user(user_id: str):
    await db.refresh_sessions.delete_many({"user_id": user_id})

# ---------- Cookies ----------
def set_auth_cookies(response: Response, access: str, refresh: str):
    common = dict(httponly=True, secure=True, samesite="none", path="/")
    response.set_cookie("access_token", access, max_age=ACCESS_TTL_MIN * 60, **common)
    response.set_cookie("refresh_token", refresh, max_age=REFRESH_TTL_DAYS * 86400, **common)

def clear_auth_cookies(response: Response):
    for name in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(name, path="/")

async def issue_tokens_and_set(response: Response, user_id: str, email: str):
    """Convenience: issue new access + refresh, set cookies, persist jti, stamp last_auth_at."""
    access = create_access_token(user_id, email)
    refresh, jti = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    await persist_refresh_jti(user_id, jti)
    await db.users.update_one({"user_id": user_id}, {"$set": {"last_auth_at": now_iso()}})
    return access, refresh, jti

# ---------- Current user ----------
async def _user_by_id(user_id: str):
    return await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})

async def get_current_user(request: Request):
    """Accepts both a JWT access_token (email/password flow) and the opaque
    session_token (Google OAuth flow). Cookie first, Authorization: Bearer fallback."""
    # 1) JWT access token
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
            if payload.get("type") == "access":
                user = await _user_by_id(payload["sub"])
                if user:
                    return user
        except jwt.ExpiredSignatureError:
            pass
        except jwt.InvalidTokenError:
            pass

    # 2) Opaque Google session_token (cookie or Bearer)
    sess_token = request.cookies.get("session_token")
    if not sess_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            sess_token = auth.split(" ", 1)[1]
    if sess_token:
        sess = await db.user_sessions.find_one({"session_token": sess_token}, {"_id": 0})
        if sess and _to_aware(sess["expires_at"]) >= datetime.now(timezone.utc):
            user = await _user_by_id(sess["user_id"])
            if user:
                return user
    raise HTTPException(status_code=401, detail="Not authenticated")

async def require_fresh_auth(user=Depends(get_current_user)):
    """Guard sensitive settings (e.g. add-password) so a stolen tab from an
    idle session can't attach a password. Requires the user to have signed in
    or re-authenticated within FRESH_AUTH_WINDOW_MIN minutes."""
    last_iso = user.get("last_auth_at")
    if not last_iso:
        logger.warning(f"[fresh-auth] denied user_id={user.get('user_id')} reason=no_last_auth_at")
        raise HTTPException(status_code=401, detail="Please sign in again to change security settings.")
    try:
        last = _to_aware(last_iso)
    except Exception:
        logger.warning(f"[fresh-auth] denied user_id={user.get('user_id')} reason=bad_timestamp")
        raise HTTPException(status_code=401, detail="Please sign in again to change security settings.")
    if datetime.now(timezone.utc) - last > timedelta(minutes=FRESH_AUTH_WINDOW_MIN):
        logger.warning(f"[fresh-auth] denied user_id={user.get('user_id')} reason=stale age_seconds={int((datetime.now(timezone.utc) - last).total_seconds())}")
        raise HTTPException(
            status_code=401,
            detail=f"Please sign in again within the last {FRESH_AUTH_WINDOW_MIN} minutes to change security settings.",
        )
    return user

# ---------- Role guards ----------
def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user

def require_doctor_or_admin(user=Depends(get_current_user)):
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(403, "Doctor only")
    return user
