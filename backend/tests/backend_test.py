"""Backend API tests for GLP-1 Care Platform."""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://metabolic-care-4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------------- Public content endpoints ----------------
class TestPublicContent:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_doctors(self):
        r = requests.get(f"{API}/doctors")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 6
        assert "doctor_id" in data[0]
        assert "name" in data[0]
        assert "specialty" in data[0]

    def test_programs(self):
        r = requests.get(f"{API}/programs")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 4
        slugs = {p["slug"] for p in data}
        assert {"weight-loss", "diabetes", "pcos", "metabolic"}.issubset(slugs)

    def test_plans(self):
        r = requests.get(f"{API}/plans")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 3
        codes = {p["code"] for p in data}
        assert {"monthly", "quarterly", "annual"}.issubset(codes)

    def test_testimonials(self):
        r = requests.get(f"{API}/testimonials")
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_blog_list(self):
        r = requests.get(f"{API}/blog")
        assert r.status_code == 200
        posts = r.json()
        assert len(posts) >= 6
        assert "slug" in posts[0]

    def test_blog_filter_by_category(self):
        r = requests.get(f"{API}/blog", params={"category": "Nutrition"})
        assert r.status_code == 200
        posts = r.json()
        assert all(p["category"] == "Nutrition" for p in posts)

    def test_blog_detail(self):
        r = requests.get(f"{API}/blog/what-is-glp1")
        assert r.status_code == 200
        assert r.json().get("slug") == "what-is-glp1"

    def test_blog_detail_404(self):
        r = requests.get(f"{API}/blog/nonexistent-slug-xyz")
        assert r.status_code == 404

    def test_faqs(self):
        r = requests.get(f"{API}/faqs")
        assert r.status_code == 200
        assert len(r.json()) >= 6

    def test_platform_stats(self):
        r = requests.get(f"{API}/platform-stats")
        assert r.status_code == 200
        stats = r.json()
        assert "patients_served" in stats
        assert "kg_lost" in stats
        assert stats["patients_served"] > 0


# ---------------- Contact / Newsletter ----------------
class TestContactNewsletter:
    def test_contact_submit(self):
        payload = {
            "name": "TEST_User",
            "email": "TEST_user@example.com",
            "message": "Hello, this is a test message.",
            "topic": "general",
        }
        r = requests.post(f"{API}/contact", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        assert body.get("id", "").startswith("msg_")

    def test_newsletter_subscribe(self):
        r = requests.post(f"{API}/newsletter", json={"email": "TEST_news@example.com"})
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------------- Auth (unauthenticated) ----------------
class TestAuthUnauthenticated:
    def test_me_no_cookie(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_patient_dashboard_no_auth(self):
        r = requests.get(f"{API}/patient/dashboard")
        assert r.status_code == 401

    def test_doctor_dashboard_no_auth(self):
        r = requests.get(f"{API}/doctor/dashboard")
        assert r.status_code == 401

    def test_admin_stats_no_auth(self):
        r = requests.get(f"{API}/admin/stats")
        assert r.status_code == 401


# ---------------- Auth via manually inserted MongoDB session ----------------
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


def _create_test_session(role="patient", email_prefix="TEST_"):
    """Insert a user + session into MongoDB and return (user_id, token, doctor_id_for_appt)."""

    async def _run():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        user_id = f"user_TEST_{uuid.uuid4().hex[:8]}"
        token = f"tok_TEST_{uuid.uuid4().hex}"
        email = f"{email_prefix}{uuid.uuid4().hex[:6]}@example.com"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": "TEST User",
            "picture": "",
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": datetime.now(timezone.utc).isoformat(),
        })
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # Grab a doctor id
        doc = await db.doctors.find_one({}, {"_id": 0})
        client.close()
        return user_id, token, (doc or {}).get("doctor_id")

    return asyncio.run(_run())


def _cleanup_user(user_id, token):
    async def _run():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.user_sessions.delete_many({"session_token": token})
        await db.users.delete_many({"user_id": user_id})
        await db.health_metrics.delete_many({"user_id": user_id})
        await db.appointments.delete_many({"patient_id": user_id})
        await db.goals.delete_many({"user_id": user_id})
        client.close()
    asyncio.run(_run())


@pytest.fixture
def patient_session():
    uid_, token, doctor_id = _create_test_session("patient")
    yield {"user_id": uid_, "token": token, "doctor_id": doctor_id}
    _cleanup_user(uid_, token)


@pytest.fixture
def doctor_session():
    uid_, token, doctor_id = _create_test_session("doctor")
    yield {"user_id": uid_, "token": token, "doctor_id": doctor_id}
    _cleanup_user(uid_, token)


@pytest.fixture
def admin_session():
    uid_, token, doctor_id = _create_test_session("admin")
    yield {"user_id": uid_, "token": token, "doctor_id": doctor_id}
    _cleanup_user(uid_, token)


class TestPatientAuthenticated:
    def test_auth_me(self, patient_session):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {patient_session['token']}"})
        assert r.status_code == 200
        u = r.json()
        assert u["user_id"] == patient_session["user_id"]
        assert u["role"] == "patient"

    def test_patient_dashboard(self, patient_session):
        h = {"Authorization": f"Bearer {patient_session['token']}"}
        r = requests.get(f"{API}/patient/dashboard", headers=h)
        assert r.status_code == 200
        d = r.json()
        for k in ("metrics", "appointments", "medications", "goals"):
            assert k in d and isinstance(d[k], list)

    def test_patient_checkin(self, patient_session):
        h = {"Authorization": f"Bearer {patient_session['token']}"}
        r = requests.post(f"{API}/patient/checkin", headers=h, json={
            "weight_kg": 82.5, "waist_cm": 92.0, "energy": 7, "mood": 8, "notes": "TEST checkin"
        })
        assert r.status_code == 200
        body = r.json()
        assert body["weight_kg"] == 82.5
        assert body["user_id"] == patient_session["user_id"]
        assert body["id"].startswith("chk_")

        # Verify persisted via GET dashboard
        dash = requests.get(f"{API}/patient/dashboard", headers=h).json()
        assert any(m["id"] == body["id"] for m in dash["metrics"])

    def test_patient_appointment(self, patient_session):
        h = {"Authorization": f"Bearer {patient_session['token']}"}
        doctor_id = patient_session["doctor_id"]
        assert doctor_id, "No doctor in DB — seed missing"
        r = requests.post(f"{API}/patient/appointment", headers=h, json={
            "doctor_id": doctor_id,
            "scheduled_at": "2026-02-15T10:00:00Z",
            "reason": "TEST consult",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["doctor_id"] == doctor_id
        assert body["patient_id"] == patient_session["user_id"]
        assert body["status"] == "scheduled"

    def test_patient_appointment_invalid_doctor(self, patient_session):
        h = {"Authorization": f"Bearer {patient_session['token']}"}
        r = requests.post(f"{API}/patient/appointment", headers=h, json={
            "doctor_id": "doc_nonexistent",
            "scheduled_at": "2026-02-15T10:00:00Z",
            "reason": "TEST",
        })
        assert r.status_code == 404

    def test_patient_goal(self, patient_session):
        h = {"Authorization": f"Bearer {patient_session['token']}"}
        r = requests.post(f"{API}/patient/goal", headers=h, json={
            "title": "TEST Lose 5kg", "target": "5kg", "due_date": "2026-06-01"
        })
        assert r.status_code == 200
        body = r.json()
        assert body["title"] == "TEST Lose 5kg"
        assert body["achieved"] is False

    def test_patient_cannot_access_doctor(self, patient_session):
        h = {"Authorization": f"Bearer {patient_session['token']}"}
        r = requests.get(f"{API}/doctor/dashboard", headers=h)
        assert r.status_code == 403

    def test_patient_cannot_access_admin(self, patient_session):
        h = {"Authorization": f"Bearer {patient_session['token']}"}
        r = requests.get(f"{API}/admin/stats", headers=h)
        assert r.status_code == 403


class TestDoctorAuthenticated:
    def test_doctor_dashboard(self, doctor_session):
        h = {"Authorization": f"Bearer {doctor_session['token']}"}
        r = requests.get(f"{API}/doctor/dashboard", headers=h)
        assert r.status_code == 200
        d = r.json()
        assert "appointments" in d
        assert "patients" in d

    def test_doctor_cannot_access_admin(self, doctor_session):
        h = {"Authorization": f"Bearer {doctor_session['token']}"}
        r = requests.get(f"{API}/admin/users", headers=h)
        assert r.status_code == 403


class TestAdminAuthenticated:
    def test_admin_stats(self, admin_session):
        h = {"Authorization": f"Bearer {admin_session['token']}"}
        r = requests.get(f"{API}/admin/stats", headers=h)
        assert r.status_code == 200
        s = r.json()
        for k in ("users", "doctors", "appointments"):
            assert k in s
        assert s["doctors"] >= 6

    def test_admin_users(self, admin_session):
        h = {"Authorization": f"Bearer {admin_session['token']}"}
        r = requests.get(f"{API}/admin/users", headers=h)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_appointments(self, admin_session):
        h = {"Authorization": f"Bearer {admin_session['token']}"}
        r = requests.get(f"{API}/admin/appointments", headers=h)
        assert r.status_code == 200

    def test_admin_can_access_doctor(self, admin_session):
        h = {"Authorization": f"Bearer {admin_session['token']}"}
        r = requests.get(f"{API}/doctor/dashboard", headers=h)
        assert r.status_code == 200


# ---------------- AI Assessment ----------------
class TestAIAssessment:
    def test_ai_assessment_basic(self):
        r = requests.post(f"{API}/ai/assessment", json={
            "message": "Hi Aria, I want to lose weight. I'm 35, 90kg."
        }, timeout=45)
        assert r.status_code == 200, f"AI failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert "reply" in data and isinstance(data["reply"], str)
        assert len(data["reply"]) > 5
        assert "session_id" in data
