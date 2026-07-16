"""Patient dashboard: metrics, check-ins, appointments, goals."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from deps import db, uid, now_iso, get_current_user

router = APIRouter(prefix="/patient")


class HealthCheckIn(BaseModel):
    weight_kg: Optional[float] = None
    waist_cm: Optional[float] = None
    energy: Optional[int] = None
    mood: Optional[int] = None
    notes: Optional[str] = None

class AppointmentCreate(BaseModel):
    doctor_id: str
    scheduled_at: str
    reason: Optional[str] = None

class GoalCreate(BaseModel):
    title: str
    target: str
    due_date: Optional[str] = None


@router.get("/dashboard")
async def patient_dashboard(user=Depends(get_current_user)):
    uid_ = user["user_id"]
    metrics = await db.health_metrics.find({"user_id": uid_}, {"_id": 0}).sort("recorded_at", 1).to_list(200)
    appts = await db.appointments.find({"patient_id": uid_}, {"_id": 0}).sort("scheduled_at", 1).to_list(50)
    meds = await db.medications.find({"user_id": uid_}, {"_id": 0}).to_list(50)
    goals = await db.goals.find({"user_id": uid_}, {"_id": 0}).to_list(50)
    return {"metrics": metrics, "appointments": appts, "medications": meds, "goals": goals}

@router.post("/checkin")
async def add_checkin(c: HealthCheckIn, user=Depends(get_current_user)):
    doc = c.model_dump()
    doc.update({"id": uid("chk"), "user_id": user["user_id"], "recorded_at": now_iso()})
    await db.health_metrics.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.post("/appointment")
async def book_appointment(a: AppointmentCreate, user=Depends(get_current_user)):
    doctor = await db.doctors.find_one({"doctor_id": a.doctor_id}, {"_id": 0})
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    doc = {
        "id": uid("apt"),
        "patient_id": user["user_id"],
        "patient_name": user["name"],
        "doctor_id": a.doctor_id,
        "doctor_name": doctor["name"],
        "scheduled_at": a.scheduled_at,
        "reason": a.reason or "General consultation",
        "status": "scheduled",
        "created_at": now_iso(),
    }
    await db.appointments.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.post("/goal")
async def add_goal(g: GoalCreate, user=Depends(get_current_user)):
    doc = g.model_dump()
    doc.update({"id": uid("goal"), "user_id": user["user_id"], "achieved": False, "created_at": now_iso()})
    await db.goals.insert_one(doc)
    doc.pop("_id", None)
    return doc
