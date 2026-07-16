"""Iteration 2 backend tests: labs, messaging, doctor notes, onboarding."""
import os
import uuid
import asyncio
from datetime import datetime, timezone, timedelta

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from /app/frontend/.env
    try:
        with open('/app/frontend/.env') as _f:
            for _line in _f:
                if _line.startswith('REACT_APP_BACKEND_URL='):
                    BASE_URL = _line.split('=', 1)[1].strip().strip('"').rstrip('/')
                    break
    except FileNotFoundError:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


def _create_session(role="patient"):
    async def _run():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        user_id = f"user_TEST_{uuid.uuid4().hex[:8]}"
        token = f"tok_TEST_{uuid.uuid4().hex}"
        email = f"TEST_{uuid.uuid4().hex[:6]}@example.com"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": f"TEST {role.title()}",
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
        client.close()
        return user_id, token
    return asyncio.run(_run())


def _cleanup(user_ids):
    async def _run():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        for uid_ in user_ids:
            await db.users.delete_many({"user_id": uid_})
            await db.user_sessions.delete_many({"user_id": uid_})
            await db.lab_orders.delete_many({"user_id": uid_})
            await db.lab_reports.delete_many({"user_id": uid_})
            await db.messages.delete_many({"$or": [{"from_user_id": uid_}, {"to_user_id": uid_}]})
            await db.consultation_notes.delete_many({"$or": [{"doctor_id": uid_}, {"patient_id": uid_}]})
        await db.onboarding_submissions.delete_many({"email": {"$regex": "^TEST_"}})
        client.close()
    asyncio.run(_run())


@pytest.fixture
def patient():
    uid_, tok = _create_session("patient")
    yield {"user_id": uid_, "token": tok, "h": {"Authorization": f"Bearer {tok}"}}
    _cleanup([uid_])


@pytest.fixture
def doctor():
    uid_, tok = _create_session("doctor")
    yield {"user_id": uid_, "token": tok, "h": {"Authorization": f"Bearer {tok}"}}
    _cleanup([uid_])


@pytest.fixture
def patient_and_doctor():
    p_id, p_tok = _create_session("patient")
    d_id, d_tok = _create_session("doctor")
    yield {
        "patient": {"user_id": p_id, "token": p_tok, "h": {"Authorization": f"Bearer {p_tok}"}},
        "doctor": {"user_id": d_id, "token": d_tok, "h": {"Authorization": f"Bearer {d_tok}"}},
    }
    _cleanup([p_id, d_id])


# ---------- Lab tests catalog ----------
class TestLabTests:
    def test_list_lab_tests_seeded(self):
        r = requests.get(f"{API}/lab-tests")
        assert r.status_code == 200
        data = r.json()
        codes = {t["code"] for t in data}
        expected = {"hba1c", "lipid", "fasting-insulin", "thyroid", "pcos-hormones", "metabolic-panel"}
        assert expected.issubset(codes), f"Missing lab tests: {expected - codes}"
        assert len(data) >= 6
        # Structural check
        for t in data:
            assert "name" in t and "price" in t and "markers" in t


# ---------- Lab orders ----------
class TestLabOrders:
    def test_create_lab_order_requires_auth(self):
        r = requests.post(f"{API}/patient/lab-order", json={"test_code": "hba1c"})
        assert r.status_code == 401

    def test_create_lab_order_success(self, patient):
        r = requests.post(f"{API}/patient/lab-order", headers=patient["h"], json={
            "test_code": "hba1c",
            "collection_type": "home",
            "scheduled_at": "2026-02-10T09:00:00Z",
            "address": "TEST 123 Main St",
            "notes": "TEST fasting",
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["test_code"] == "hba1c"
        assert body["test_name"] == "HbA1c"
        assert body["user_id"] == patient["user_id"]
        assert body["status"] == "scheduled"
        assert body["id"].startswith("lab_")
        # GET verifies persistence
        lr = requests.get(f"{API}/patient/lab-orders", headers=patient["h"])
        assert lr.status_code == 200
        assert any(o["id"] == body["id"] for o in lr.json())

    def test_create_lab_order_unknown_test(self, patient):
        r = requests.post(f"{API}/patient/lab-order", headers=patient["h"], json={"test_code": "does-not-exist"})
        assert r.status_code == 404


# ---------- Lab reports ----------
class TestLabReports:
    def test_upload_lab_report_requires_auth(self):
        r = requests.post(f"{API}/patient/lab-report", json={"title": "X"})
        assert r.status_code == 401

    def test_upload_lab_report_and_no_blob_returned(self, patient):
        payload = {
            "title": "TEST HbA1c January",
            "test_code": "hba1c",
            "values": {"HbA1c": 6.1, "LDL": 110.0},
            "units": {"HbA1c": "%", "LDL": "mg/dL"},
            "file_name": "test.pdf",
            "file_data": "data:application/pdf;base64,JVBERi0xLjQK",
            "notes": "TEST note",
        }
        r = requests.post(f"{API}/patient/lab-report", headers=patient["h"], json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["title"] == "TEST HbA1c January"
        assert body["values"]["HbA1c"] == 6.1
        assert "file_data" not in body, "file_data blob must not be returned in POST response"
        assert body["reviewed"] is False
        # List
        lr = requests.get(f"{API}/patient/lab-reports", headers=patient["h"])
        assert lr.status_code == 200
        items = lr.json()
        assert any(x["id"] == body["id"] for x in items)
        for x in items:
            assert "file_data" not in x, "file_data must be stripped in list endpoint"


# ---------- Messaging ----------
class TestMessaging:
    def test_send_requires_auth(self):
        r = requests.post(f"{API}/messages", json={"to_user_id": "x", "body": "hi"})
        assert r.status_code == 401

    def test_send_unknown_recipient(self, patient):
        r = requests.post(f"{API}/messages", headers=patient["h"],
                          json={"to_user_id": "user_nonexistent", "body": "hi"})
        assert r.status_code == 404

    def test_thread_deterministic_and_read_marking(self, patient_and_doctor):
        p = patient_and_doctor["patient"]
        d = patient_and_doctor["doctor"]
        # Patient → doctor
        r1 = requests.post(f"{API}/messages", headers=p["h"],
                           json={"to_user_id": d["user_id"], "body": "Hello doc"})
        assert r1.status_code == 200
        thread_id_1 = r1.json()["thread_id"]
        assert r1.json()["read"] is False
        # Doctor → patient
        r2 = requests.post(f"{API}/messages", headers=d["h"],
                           json={"to_user_id": p["user_id"], "body": "Hi patient"})
        assert r2.status_code == 200
        thread_id_2 = r2.json()["thread_id"]
        # Same deterministic thread id regardless of direction
        assert thread_id_1 == thread_id_2

        # Doctor fetches thread → should mark patient's message as read
        th = requests.get(f"{API}/messages/thread", headers=d["h"],
                          params={"with_user_id": p["user_id"]})
        assert th.status_code == 200
        msgs = th.json()
        assert len(msgs) >= 2
        # ordering by created_at ascending
        ts = [m["created_at"] for m in msgs]
        assert ts == sorted(ts)
        # After doctor reads, patient's message to doctor should be marked read
        # Re-fetch and verify
        th2 = requests.get(f"{API}/messages/thread", headers=d["h"],
                           params={"with_user_id": p["user_id"]})
        for m in th2.json():
            if m["to_user_id"] == d["user_id"]:
                assert m["read"] is True

    def test_threads_list(self, patient_and_doctor):
        p = patient_and_doctor["patient"]
        d = patient_and_doctor["doctor"]
        # Create some messages
        requests.post(f"{API}/messages", headers=p["h"],
                      json={"to_user_id": d["user_id"], "body": "Q1"})
        requests.post(f"{API}/messages", headers=p["h"],
                      json={"to_user_id": d["user_id"], "body": "Q2"})
        # Doctor sees a thread with unread=2
        r = requests.get(f"{API}/messages/threads", headers=d["h"])
        assert r.status_code == 200
        threads = r.json()
        assert len(threads) >= 1
        t = next((x for x in threads if x["other_user_id"] == p["user_id"]), None)
        assert t is not None
        assert t["unread"] == 2
        assert t["last_message"] == "Q2"
        assert "last_at" in t and "other_name" in t


# ---------- Doctor notes ----------
class TestDoctorNotes:
    def test_note_requires_doctor_role(self, patient_and_doctor):
        p = patient_and_doctor["patient"]
        d = patient_and_doctor["doctor"]
        # Patient can't create
        r = requests.post(f"{API}/doctor/note", headers=p["h"], json={
            "patient_id": p["user_id"], "subjective": "s"
        })
        assert r.status_code == 403
        # Doctor can
        r2 = requests.post(f"{API}/doctor/note", headers=d["h"], json={
            "patient_id": p["user_id"],
            "subjective": "TEST S",
            "objective": "TEST O",
            "assessment": "TEST A",
            "plan": "TEST P",
            "follow_up_at": "2026-03-01T10:00:00Z",
        })
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["doctor_id"] == d["user_id"]
        assert body["patient_id"] == p["user_id"]
        assert body["patient_name"].startswith("TEST")
        assert body["subjective"] == "TEST S"
        # List
        lst = requests.get(f"{API}/doctor/notes", headers=d["h"])
        assert lst.status_code == 200
        assert any(n["id"] == body["id"] for n in lst.json())

    def test_note_unknown_patient(self, doctor):
        r = requests.post(f"{API}/doctor/note", headers=doctor["h"], json={
            "patient_id": "user_nonexistent", "subjective": "x"
        })
        assert r.status_code == 404

    def test_list_notes_requires_doctor(self, patient):
        r = requests.get(f"{API}/doctor/notes", headers=patient["h"])
        assert r.status_code == 403


# ---------- Doctor view lab reports ----------
class TestDoctorLabReports:
    def test_doctor_can_view_lab_reports(self, patient_and_doctor):
        p = patient_and_doctor["patient"]
        d = patient_and_doctor["doctor"]
        # Patient uploads a report
        up = requests.post(f"{API}/patient/lab-report", headers=p["h"], json={
            "title": "TEST doc-view report",
            "values": {"HbA1c": 5.8},
            "file_data": "AAAA" * 10,
        })
        assert up.status_code == 200

        # Doctor lists all
        r = requests.get(f"{API}/doctor/lab-reports", headers=d["h"])
        assert r.status_code == 200
        reports = r.json()
        assert any(x["title"] == "TEST doc-view report" for x in reports)
        for x in reports:
            assert "file_data" not in x

        # Filter by patient_id
        r2 = requests.get(f"{API}/doctor/lab-reports", headers=d["h"],
                          params={"patient_id": p["user_id"]})
        assert r2.status_code == 200
        assert all(x["user_id"] == p["user_id"] for x in r2.json())

    def test_patient_cannot_view_doctor_lab_reports(self, patient):
        r = requests.get(f"{API}/doctor/lab-reports", headers=patient["h"])
        assert r.status_code == 403


# ---------- Onboarding ----------
class TestOnboarding:
    def test_onboarding_bmi_and_default_recommendation(self):
        r = requests.post(f"{API}/onboarding", json={
            "goal": "lose weight",
            "conditions": [],
            "weight_kg": 90,
            "height_cm": 170,
            "age": 40,
            "sex": "male",
            "email": "TEST_onb1@example.com",
            "name": "TEST OB",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["bmi"] == round(90 / (1.7 ** 2), 1)
        assert body["recommended_program"] == "weight-loss"
        assert "submission" in body

    def test_onboarding_diabetes_recommendation(self):
        r = requests.post(f"{API}/onboarding", json={
            "goal": "manage diabetes",
            "conditions": ["Diabetes"],
            "weight_kg": 85,
            "height_cm": 165,
            "email": "TEST_onb2@example.com",
        })
        assert r.status_code == 200
        assert r.json()["recommended_program"] == "diabetes"

    def test_onboarding_pcos_recommendation(self):
        r = requests.post(f"{API}/onboarding", json={
            "goal": "PCOS",
            "conditions": ["PCOS"],
            "email": "TEST_onb3@example.com",
        })
        assert r.status_code == 200
        assert r.json()["recommended_program"] == "pcos"
        assert r.json()["bmi"] is None

    def test_onboarding_no_auth_required(self):
        # Should not require auth headers
        r = requests.post(f"{API}/onboarding", json={"goal": "x", "conditions": []})
        assert r.status_code == 200
