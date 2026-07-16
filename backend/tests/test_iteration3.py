"""
Iteration 3 backend tests — JWT email/password auth coexisting with Google OAuth.

Covers:
- POST /api/auth/register (roles, password min-length, duplicates)
- POST /api/auth/login (success, wrong password, brute-force lockout)
- POST /api/auth/refresh (rotation, invalid/missing token)
- POST /api/auth/logout (cookie clearing)
- POST /api/auth/forgot-password (no enumeration, log token capture)
- POST /api/auth/reset-password (valid/invalid tokens)
- GET  /api/auth/me (JWT cookie, JWT bearer, opaque session_token fallback)
- Admin seed idempotency + admin-only endpoints
- Google OAuth session_token compatibility (mock via direct DB insert)
"""

import os
import re
import uuid
import time
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
# Fallback: use frontend/.env value
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().strip('"').rstrip('/')
                break

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "aasati444@gmail.com"
ADMIN_PASSWORD = "Verdia@Admin2026"


def _new_email(prefix="TESTPAT"):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:10]}@example.com"


# -------------------- Register --------------------
class TestRegister:
    def test_register_success_sets_cookies_and_returns_user(self):
        email = _new_email()
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "Test User"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "user" in data
        assert data["user"]["email"] == email.lower()
        assert data["user"]["role"] == "patient"
        assert "password_hash" not in data["user"]
        # cookies
        assert "access_token" in s.cookies.get_dict()
        assert "refresh_token" in s.cookies.get_dict()

    def test_register_doctor_prefix(self):
        email = f"dr.{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "Dr Test"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "doctor"

    def test_register_short_password_422(self):
        r = requests.post(f"{API}/auth/register", json={"email": _new_email(), "password": "short", "name": "X"})
        assert r.status_code == 422

    def test_register_duplicate_409(self):
        email = _new_email("DUP")
        r1 = requests.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "X"})
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "Y"})
        assert r2.status_code == 409


# -------------------- Login --------------------
class TestLogin:
    def test_admin_login_success(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["email"] == ADMIN_EMAIL.lower()
        assert u["role"] == "admin"
        assert "access_token" in s.cookies.get_dict()
        assert "refresh_token" in s.cookies.get_dict()

    def test_login_wrong_password_401(self):
        email = _new_email("WPW")
        requests.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "X"})
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrongpass9!"})
        assert r.status_code == 401
        assert r.json().get("detail") == "Invalid email or password."

    def test_login_unknown_email_401(self):
        r = requests.post(f"{API}/auth/login", json={"email": _new_email("NX"), "password": "Whatever9!"})
        assert r.status_code == 401

    def test_login_brute_force_429(self):
        # Fresh email so we own the counter for this IP+email.
        # NOTE: the ingress balances between multiple pods so different requests may
        # be routed to different backend replicas. We use a keep-alive Session AND
        # send enough attempts (12) so even if load-balanced 50/50 both replicas
        # cross the 5-fail threshold.
        email = _new_email("BF")
        s = requests.Session()
        s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "X"})
        codes = []
        for _ in range(12):
            r = s.post(f"{API}/auth/login", json={"email": email, "password": "wrongpass9!"})
            codes.append(r.status_code)
        assert 429 in codes, f"expected a 429 in {codes}"


# -------------------- /auth/me + Refresh + Logout --------------------
class TestSessionLifecycle:
    def test_me_with_cookie_and_bearer(self):
        email = _new_email("ME")
        s = requests.Session()
        s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "Me"})
        # cookie
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == email.lower()
        # bearer
        access = s.cookies.get_dict().get("access_token")
        r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {access}"})
        assert r2.status_code == 200
        assert r2.json()["email"] == email.lower()

    def test_me_unauthenticated_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_refresh_rotates_access(self):
        email = _new_email("RF")
        s = requests.Session()
        s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "RF"})
        old_access = s.cookies.get_dict()["access_token"]
        time.sleep(1)  # ensure exp differs
        r = s.post(f"{API}/auth/refresh")
        assert r.status_code == 200
        new_access = s.cookies.get_dict()["access_token"]
        assert new_access and new_access != old_access

    def test_refresh_without_cookie_401(self):
        r = requests.post(f"{API}/auth/refresh")
        assert r.status_code == 401

    def test_refresh_with_access_token_as_refresh_401(self):
        # Sending an access token in the refresh_token cookie should be rejected
        email = _new_email("RFT")
        s = requests.Session()
        s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "RFT"})
        access = s.cookies.get_dict()["access_token"]
        r = requests.post(f"{API}/auth/refresh", cookies={"refresh_token": access})
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        email = _new_email("LO")
        s = requests.Session()
        s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "LO"})
        assert "access_token" in s.cookies.get_dict()
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # Server sends Set-Cookie with empty value / expired; requests should clear it
        assert s.cookies.get_dict().get("access_token", "") in ("", None)
        # /auth/me should now be 401
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 401


# -------------------- Forgot / Reset password --------------------
class TestPasswordReset:
    def _tail_backend_log(self, n=800):
        text = ""
        for path in ("/var/log/supervisor/backend.err.log", "/var/log/supervisor/backend.out.log"):
            try:
                with open(path) as f:
                    lines = f.readlines()[-n:]
                    text += "".join(lines)
            except FileNotFoundError:
                continue
        return text

    def test_forgot_password_no_enumeration_and_full_reset_flow(self):
        email = _new_email("PR")
        s = requests.Session()
        s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "PR"})
        # unknown email -> still ok:true
        r_unk = requests.post(f"{API}/auth/forgot-password", json={"email": _new_email("UNK")})
        assert r_unk.status_code == 200
        assert r_unk.json().get("ok") is True

        # real email
        r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # give the log a moment to flush
        time.sleep(1)
        log = self._tail_backend_log(800)
        m = re.search(rf"\[PASSWORD RESET\] link for {re.escape(email.lower())}: /reset-password\?token=([A-Za-z0-9_\-]+)", log)
        assert m, "reset token not found in backend logs"
        token = m.group(1)

        # invalid token -> 400
        r_bad = requests.post(f"{API}/auth/reset-password", json={"token": "not-a-real-token", "password": "N3wPass!!"})
        assert r_bad.status_code == 400

        # valid reset
        r_ok = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "N3wPass!!123"})
        assert r_ok.status_code == 200

        # login with new password works
        r_login = requests.post(f"{API}/auth/login", json={"email": email, "password": "N3wPass!!123"})
        assert r_login.status_code == 200

        # old password no longer works
        r_old = requests.post(f"{API}/auth/login", json={"email": email, "password": "Passw0rd!"})
        assert r_old.status_code == 401

        # token cannot be reused
        r_reuse = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "Another9!!"})
        assert r_reuse.status_code == 400


# -------------------- Admin endpoints --------------------
class TestAdminAccess:
    def test_admin_stats_users_appointments(self):
        s = requests.Session()
        r_login = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r_login.status_code == 200

        r_stats = s.get(f"{API}/admin/stats")
        assert r_stats.status_code == 200
        stats = r_stats.json()
        for k in ("users", "doctors", "appointments"):
            assert k in stats

        r_users = s.get(f"{API}/admin/users")
        assert r_users.status_code == 200
        assert isinstance(r_users.json(), list)

        r_appts = s.get(f"{API}/admin/appointments")
        assert r_appts.status_code == 200
        assert isinstance(r_appts.json(), list)

    def test_admin_endpoints_forbidden_for_patient(self):
        email = _new_email("PAT")
        s = requests.Session()
        s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!", "name": "P"})
        r = s.get(f"{API}/admin/stats")
        assert r.status_code == 403


# -------------------- Google OAuth session_token fallback --------------------
class TestGoogleSessionFallback:
    """Ensure get_current_user still accepts an opaque session_token from user_sessions
    (Iteration 1 mechanism). We can't run real Google OAuth, but we insert a session doc
    directly into Mongo via a small helper below to guarantee the code path works when a
    valid session exists. If Mongo isn't accessible from tests, this test is skipped."""

    def test_session_token_bearer_still_works(self):
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
        except Exception:
            pytest.skip("motor not available")

        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def _seed():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            email = _new_email("GG").lower()
            await db.users.insert_one({
                "user_id": user_id,
                "email": email,
                "name": "Google Fallback",
                "picture": "",
                "role": "patient",
                "created_at": "2026-01-01T00:00:00+00:00",
            })
            session_token = f"sess_{uuid.uuid4().hex}"
            await db.user_sessions.insert_one({
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": "2099-12-31T00:00:00+00:00",
                "created_at": "2026-01-01T00:00:00+00:00",
            })
            client.close()
            return session_token, email

        session_token, email = asyncio.get_event_loop().run_until_complete(_seed()) if False else asyncio.new_event_loop().run_until_complete(_seed())

        # Bearer
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {session_token}"})
        assert r.status_code == 200, r.text
        assert r.json()["email"] == email

        # Cookie
        r2 = requests.get(f"{API}/auth/me", cookies={"session_token": session_token})
        assert r2.status_code == 200
        assert r2.json()["email"] == email


# -------------------- Cleanup --------------------
@pytest.fixture(scope="session", autouse=True)
def _cleanup_at_end():
    yield
    # Best-effort: remove TEST_ prefixed users + their sessions/attempts
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def _clean():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            # Users with TEST_ prefixed emails
            cursor = db.users.find({"email": {"$regex": "^test_"}}, {"user_id": 1, "email": 1, "_id": 0})
            ids = []
            async for u in cursor:
                ids.append(u["user_id"])
            if ids:
                await db.user_sessions.delete_many({"user_id": {"$in": ids}})
                await db.password_reset_tokens.delete_many({"user_id": {"$in": ids}})
                await db.users.delete_many({"user_id": {"$in": ids}})
            await db.login_attempts.delete_many({"identifier": {"$regex": ":test_"}})
            client.close()

        asyncio.new_event_loop().run_until_complete(_clean())
    except Exception:
        pass
