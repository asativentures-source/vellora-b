"""
Iteration 4 backend tests — refresh-token rotation with reuse-detection
family revocation, plus Add / Change password + security-state endpoint.

Covers:
- refresh_sessions collection is populated on register/login
- POST /auth/refresh rotates BOTH access AND refresh tokens (new jti)
- Refresh reuse detection: presenting an already-rotated refresh token → 401
  and MASS-revokes all of the user's refresh_sessions (family revocation)
- After reuse detection, even the latest valid refresh token now fails
- POST /auth/logout revokes current refresh jti
- POST /auth/reset-password revokes ALL user's refresh sessions
- POST /auth/change-password revokes ALL user's refresh sessions
- POST /auth/add-password: 409 if password exists; success for Google-only
  user sets a hash and issues new JWT tokens + persists refresh jti
- POST /auth/change-password: 400 if no password, 401 if wrong current, ok otherwise
- GET  /auth/security returns {has_password, has_google, active_refresh_sessions,
                              active_google_sessions}
- Regression: /register still refuses Google-only email (409)
- Regression: Google-only session_token still authenticates via get_current_user
"""

import os
import re
import uuid
import time
import pytest
import requests
import asyncio
import jwt as pyjwt

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().strip('"')
                break
BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "aasati444@gmail.com"
ADMIN_PASSWORD = "Verdia@Admin2026"

# JWT_SECRET is only used to *decode* refresh_token cookies to inspect jti — this
# is server-side data leakage into tests only. It matches /app/backend/.env.
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    with open('/app/backend/.env') as f:
        for line in f:
            if line.startswith('JWT_SECRET='):
                JWT_SECRET = line.split('=', 1)[1].strip().strip('"')
                break


def _new_email(prefix="ITR4"):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _register(prefix="ITR4"):
    email = _new_email(prefix)
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "Iter4"})
    assert r.status_code == 200, r.text
    return s, email


def _jti_of(token: str) -> str:
    payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"], options={"verify_exp": False})
    return payload.get("jti")


# ---------------- Mongo helpers ----------------
# NOTE: Motor's AsyncIOMotorClient binds to the CURRENT running event loop
# at instantiation, so we must build the client INSIDE the coroutine we run.
def _run(async_fn, *args, **kwargs):
    async def _wrap():
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = AsyncIOMotorClient(mongo_url)
        try:
            return await async_fn(client[db_name], *args, **kwargs)
        finally:
            client.close()
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_wrap())
    finally:
        loop.close()


async def _count_refresh_sessions(db, user_id: str) -> int:
    return await db.refresh_sessions.count_documents({"user_id": user_id})


async def _find_user_id_by_email(db, email: str) -> str:
    u = await db.users.find_one({"email": email.lower()}, {"user_id": 1, "_id": 0})
    return u["user_id"] if u else None


async def _find_refresh_session(db, jti: str):
    return await db.refresh_sessions.find_one({"jti": jti})


async def _insert_google_only_user(db, user_id, email, session_token, picture="g"):
    # last_auth_at=now → satisfies iter5 require_fresh_auth guard on /auth/add-password.
    from datetime import datetime, timezone
    now_str = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one({
        "user_id": user_id, "email": email, "name": "TmpGoog", "picture": picture,
        "role": "patient", "created_at": "2026-01-01T00:00:00+00:00",
        "last_auth_at": now_str,
    })
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": "2099-12-31T00:00:00+00:00",
        "created_at": "2026-01-01T00:00:00+00:00",
    })


# ---------------- Refresh session tracking ----------------
class TestRefreshSessionCreation:
    def test_register_persists_refresh_jti(self):
        s, email = _register()
        user_id = _run(_find_user_id_by_email, email)
        assert user_id
        n = _run(_count_refresh_sessions, user_id)
        assert n == 1
        # jti in cookie == jti in DB
        rt = s.cookies.get_dict()["refresh_token"]
        jti = _jti_of(rt)
        row = _run(_find_refresh_session, jti)
        assert row is not None
        assert row["user_id"] == user_id

    def test_login_persists_refresh_jti(self):
        _s, email = _register()
        s2 = requests.Session()
        r = s2.post(f"{API}/auth/login", json={"email": email, "password": "Passw0rd!"})
        assert r.status_code == 200
        user_id = _run(_find_user_id_by_email, email)
        n = _run(_count_refresh_sessions, user_id)
        # 1 from register + 1 from login = 2
        assert n == 2


# ---------------- Refresh rotation ----------------
class TestRefreshRotation:
    def test_refresh_rotates_both_tokens(self):
        s, email = _register()
        old_access = s.cookies.get_dict()["access_token"]
        old_refresh = s.cookies.get_dict()["refresh_token"]
        old_jti = _jti_of(old_refresh)
        time.sleep(1)
        r = s.post(f"{API}/auth/refresh")
        assert r.status_code == 200, r.text
        new_access = s.cookies.get_dict()["access_token"]
        new_refresh = s.cookies.get_dict()["refresh_token"]
        new_jti = _jti_of(new_refresh)
        assert new_access and new_access != old_access, "access token was not rotated"
        assert new_refresh and new_refresh != old_refresh, "refresh token was not rotated"
        assert new_jti and new_jti != old_jti, "jti was not rotated"

        # Old jti is removed from refresh_sessions
        assert _run(_find_refresh_session, old_jti) is None
        assert _run(_find_refresh_session, new_jti) is not None

    def test_refresh_reuse_detection_revokes_family_401(self):
        # Register → get refresh#1
        s, email = _register()
        user_id = _run(_find_user_id_by_email, email)
        old_refresh = s.cookies.get_dict()["refresh_token"]

        # Rotate once → refresh#2 is now valid, refresh#1 is DEAD
        r = s.post(f"{API}/auth/refresh")
        assert r.status_code == 200
        latest_refresh = s.cookies.get_dict()["refresh_token"]
        assert latest_refresh != old_refresh

        # Ensure server has 1 active session (the rotated one)
        assert _run(_count_refresh_sessions, user_id) == 1

        # Present the OLD (already-rotated) refresh_token — reuse!
        r2 = requests.post(f"{API}/auth/refresh", cookies={"refresh_token": old_refresh})
        assert r2.status_code == 401
        assert "reused" in r2.text.lower() or "revoked" in r2.text.lower(), r2.text

        # Family revocation: 0 active sessions for this user now
        assert _run(_count_refresh_sessions, user_id) == 0

        # Even the LATEST valid refresh token no longer works
        r3 = requests.post(f"{API}/auth/refresh", cookies={"refresh_token": latest_refresh})
        assert r3.status_code == 401

    def test_refresh_after_logout_fails(self):
        s, _email = _register()
        rt = s.cookies.get_dict()["refresh_token"]
        rl = s.post(f"{API}/auth/logout")
        assert rl.status_code == 200
        # Present the previously-valid refresh token
        r = requests.post(f"{API}/auth/refresh", cookies={"refresh_token": rt})
        assert r.status_code == 401


# ---------------- Logout revokes jti ----------------
class TestLogoutRevoke:
    def test_logout_removes_current_refresh_session(self):
        s, email = _register()
        user_id = _run(_find_user_id_by_email, email)
        assert _run(_count_refresh_sessions, user_id) == 1
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        assert _run(_count_refresh_sessions, user_id) == 0


# ---------------- Reset password revokes all ----------------
class TestResetPasswordRevokesAll:
    def _tail_log(self, n=4000):
        text = ""
        for p in ("/var/log/supervisor/backend.err.log", "/var/log/supervisor/backend.out.log"):
            try:
                with open(p) as f:
                    text += "".join(f.readlines()[-n:])
            except FileNotFoundError:
                continue
        return text

    def test_reset_password_revokes_all_sessions(self):
        s, email = _register()
        user_id = _run(_find_user_id_by_email, email)
        # Add a 2nd session
        s2 = requests.Session()
        s2.post(f"{API}/auth/login", json={"email": email, "password": "Passw0rd!"})
        assert _run(_count_refresh_sessions, user_id) == 2

        # Trigger reset
        r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200

        # Poll the log for our specific email's reset token (parallel-worker safe)
        token = None
        pat = re.compile(rf"\[PASSWORD RESET\] link for {re.escape(email.lower())}: /reset-password\?token=([A-Za-z0-9_\-]+)")
        for _ in range(20):
            time.sleep(0.5)
            log = self._tail_log()
            m = pat.search(log)
            if m:
                token = m.group(1)
                break
        assert token, "reset token not in logs after polling"

        r_ok = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "N3wPass!!123"})
        assert r_ok.status_code == 200, r_ok.text
        assert _run(_count_refresh_sessions, user_id) == 0


# ---------------- Change password ----------------
class TestChangePassword:
    def test_change_password_success_revokes_all(self):
        s, email = _register()
        user_id = _run(_find_user_id_by_email, email)
        # extra session
        s2 = requests.Session()
        s2.post(f"{API}/auth/login", json={"email": email, "password": "Passw0rd!"})
        assert _run(_count_refresh_sessions, user_id) == 2

        r = s.post(f"{API}/auth/change-password", json={
            "current_password": "Passw0rd!",
            "new_password": "NewPass9!!x",
        })
        assert r.status_code == 200, r.text
        # All sessions revoked
        assert _run(_count_refresh_sessions, user_id) == 0
        # Login with new password works
        r_login = requests.post(f"{API}/auth/login", json={"email": email, "password": "NewPass9!!x"})
        assert r_login.status_code == 200
        # Old password rejected
        r_old = requests.post(f"{API}/auth/login", json={"email": email, "password": "Passw0rd!"})
        assert r_old.status_code == 401

    def test_change_password_wrong_current_401(self):
        s, _email = _register()
        r = s.post(f"{API}/auth/change-password", json={
            "current_password": "wrong-current",
            "new_password": "AnotherOne9!",
        })
        assert r.status_code == 401

    def test_change_password_requires_auth(self):
        r = requests.post(f"{API}/auth/change-password", json={
            "current_password": "x", "new_password": "Whatever9!",
        })
        assert r.status_code == 401

    def test_change_password_short_new_422(self):
        s, _email = _register()
        r = s.post(f"{API}/auth/change-password", json={
            "current_password": "Passw0rd!",
            "new_password": "short",
        })
        assert r.status_code == 422

    def test_change_password_when_no_password_400(self):
        # Google-only user (no password_hash) — inject via mongo + hit endpoint w/ session_token
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        email = _new_email("GONO").lower()
        session_token = f"sess_{uuid.uuid4().hex}"
        _run(_insert_google_only_user, user_id, email, session_token)
        r = requests.post(
            f"{API}/auth/change-password",
            json={"current_password": "x", "new_password": "Something9!!"},
            headers={"Authorization": f"Bearer {session_token}"},
        )
        assert r.status_code == 400


# ---------------- Add password ----------------
class TestAddPassword:
    def _make_google_only(self):
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        email = _new_email("GADD").lower()
        session_token = f"sess_{uuid.uuid4().hex}"
        _run(_insert_google_only_user, user_id, email, session_token)
        return user_id, email, session_token

    def test_add_password_google_only_success(self):
        user_id, email, session_token = self._make_google_only()
        s = requests.Session()
        r = s.post(
            f"{API}/auth/add-password",
            json={"password": "MyNewOne9!"},
            headers={"Authorization": f"Bearer {session_token}"},
        )
        assert r.status_code == 200, r.text
        # cookies now include JWT access/refresh
        assert "access_token" in s.cookies.get_dict()
        assert "refresh_token" in s.cookies.get_dict()
        # A refresh_session row is now persisted
        assert _run(_count_refresh_sessions, user_id) == 1
        # Email/password login now works
        r_login = requests.post(f"{API}/auth/login", json={"email": email, "password": "MyNewOne9!"})
        assert r_login.status_code == 200

    def test_add_password_conflict_409_when_already_has_password(self):
        s, _email = _register()  # has password_hash
        r = s.post(f"{API}/auth/add-password", json={"password": "AnotherOne9!"})
        assert r.status_code == 409

    def test_add_password_requires_auth(self):
        r = requests.post(f"{API}/auth/add-password", json={"password": "Something9!"})
        assert r.status_code == 401

    def test_add_password_short_422(self):
        _user_id, _email, session_token = self._make_google_only()
        r = requests.post(
            f"{API}/auth/add-password",
            json={"password": "short"},
            headers={"Authorization": f"Bearer {session_token}"},
        )
        assert r.status_code == 422


# ---------------- Security state ----------------
class TestSecurityState:
    def test_security_password_only_user(self):
        s, _email = _register()
        r = s.get(f"{API}/auth/security")
        assert r.status_code == 200
        data = r.json()
        assert data["has_password"] is True
        assert data["has_google"] is False
        assert data["active_refresh_sessions"] >= 1
        assert data["active_google_sessions"] == 0

    def test_security_google_only_user(self):
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        email = _new_email("GSEC").lower()
        session_token = f"sess_{uuid.uuid4().hex}"
        _run(_insert_google_only_user, user_id, email, session_token, "https://x/y.png")
        r = requests.get(f"{API}/auth/security", headers={"Authorization": f"Bearer {session_token}"})
        assert r.status_code == 200
        d = r.json()
        assert d["has_password"] is False
        assert d["has_google"] is True
        assert d["active_google_sessions"] >= 1
        assert d["active_refresh_sessions"] == 0

    def test_security_requires_auth(self):
        r = requests.get(f"{API}/auth/security")
        assert r.status_code == 401


# ---------------- Regression: register refuses Google-only email ----------------
class TestRegisterVsGoogleOnly:
    def test_register_refuses_google_only_email_409(self):
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        email = _new_email("GREG").lower()

        async def _insert(db):
            await db.users.insert_one({
                "user_id": user_id, "email": email, "name": "GReg", "picture": "g",
                "role": "patient", "created_at": "2026-01-01T00:00:00+00:00",
            })
        _run(_insert)
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "X"})
        assert r.status_code == 409
        detail = (r.json() or {}).get("detail", "")
        assert "Google" in detail


# ---------------- Regression: Google session_token still works ----------------
class TestGoogleSessionRegression:
    def test_google_session_token_authenticates_me(self):
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        email = _new_email("GME").lower()
        session_token = f"sess_{uuid.uuid4().hex}"
        _run(_insert_google_only_user, user_id, email, session_token)
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {session_token}"})
        assert r.status_code == 200
        assert r.json()["email"] == email


# ---------------- Cleanup ----------------
@pytest.fixture(scope="session", autouse=True)
def _cleanup_iter4():
    yield
    try:
        async def _clean(db):
            ids = []
            async for u in db.users.find({"email": {"$regex": "^test_"}}, {"user_id": 1, "_id": 0}):
                ids.append(u["user_id"])
            if ids:
                await db.user_sessions.delete_many({"user_id": {"$in": ids}})
                await db.refresh_sessions.delete_many({"user_id": {"$in": ids}})
                await db.password_reset_tokens.delete_many({"user_id": {"$in": ids}})
                await db.users.delete_many({"user_id": {"$in": ids}})
            await db.login_attempts.delete_many({"identifier": {"$regex": ":test_"}})
        _run(_clean)
    except Exception:
        pass
