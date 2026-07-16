"""Doctor dashboard + consultation notes."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from deps import db, uid, now_iso, get_current_user, require_doctor_or_admin

router = APIRouter(prefix="/doctor")

@router.get("/dashboard")
async def doctor_dashboard(user=Depends(require_doctor_or_admin)):
    appts = await db.appointments.find({"doctor_id": user["user_id"]}, {"_id": 0}).sort("scheduled_at", 1).to_list(200)
    if not appts:
        appts = await db.appointments.find({}, {"_id": 0}).sort("scheduled_at", 1).to_list(50)
    patients = await db.users.find({"role": "patient"}, {"_id": 0, "password_hash": 0}).to_list(100)
    return {"appointments": appts, "patients": patients}

class ConsultationNoteCreate(BaseModel):
    patient_id: str
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    follow_up_at: Optional[str] = None

@router.post("/note")
async def create_note(n: ConsultationNoteCreate, user=Depends(require_doctor_or_admin)):
    patient = await db.users.find_one({"user_id": n.patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(404, "Patient not found")
    doc = n.model_dump()
    doc.update({
        "id": uid("note"),
        "doctor_id": user["user_id"],
        "doctor_name": user["name"],
        "patient_name": patient["name"],
        "created_at": now_iso(),
    })
    await db.consultation_notes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.get("/notes")
async def list_notes(patient_id: Optional[str] = None, user=Depends(require_doctor_or_admin)):
    q = {"doctor_id": user["user_id"]}
    if patient_id:
        q = {"patient_id": patient_id}
    return await db.consultation_notes.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
