"""Diagnostics: lab test catalog, patient lab orders/reports, doctor lab-report view."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Union

from deps import db, uid, now_iso, get_current_user, require_doctor_or_admin

router = APIRouter()

@router.get("/lab-tests")
async def list_lab_tests():
    return await db.lab_tests.find({}, {"_id": 0}).to_list(100)


class LabOrderCreate(BaseModel):
    test_code: str
    collection_type: str = "home"
    scheduled_at: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

@router.post("/patient/lab-order")
async def create_lab_order(o: LabOrderCreate, user=Depends(get_current_user)):
    test = await db.lab_tests.find_one({"code": o.test_code}, {"_id": 0})
    if not test:
        raise HTTPException(404, "Test not found")
    doc = {
        "id": uid("lab"),
        "user_id": user["user_id"],
        "patient_name": user["name"],
        "test_code": o.test_code,
        "test_name": test["name"],
        "collection_type": o.collection_type,
        "scheduled_at": o.scheduled_at,
        "address": o.address,
        "notes": o.notes,
        "status": "scheduled",
        "price": test["price"],
        "created_at": now_iso(),
    }
    await db.lab_orders.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.get("/patient/lab-orders")
async def list_lab_orders(user=Depends(get_current_user)):
    return await db.lab_orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


class LabReportCreate(BaseModel):
    title: str
    test_code: Optional[str] = None
    values: Dict[str, Union[float, str]] = Field(default_factory=dict)
    units: Dict[str, str] = Field(default_factory=dict)
    file_name: Optional[str] = None
    file_data: Optional[str] = None  # base64
    notes: Optional[str] = None
    collected_at: Optional[str] = None

@router.post("/patient/lab-report")
async def upload_lab_report(r: LabReportCreate, user=Depends(get_current_user)):
    if r.file_data and len(r.file_data) > 2_500_000:
        raise HTTPException(413, "File too large (max ~2MB)")
    doc = r.model_dump()
    doc.update({
        "id": uid("rep"),
        "user_id": user["user_id"],
        "reviewed": False,
        "doctor_comment": None,
        "created_at": now_iso(),
        "collected_at": r.collected_at or now_iso(),
    })
    await db.lab_reports.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("file_data", None)
    return doc

@router.get("/patient/lab-reports")
async def list_lab_reports(user=Depends(get_current_user)):
    return await db.lab_reports.find({"user_id": user["user_id"]}, {"_id": 0, "file_data": 0}).sort("collected_at", 1).to_list(200)


@router.get("/doctor/lab-reports")
async def doctor_view_labs(patient_id: Optional[str] = None, user=Depends(require_doctor_or_admin)):
    q = {"user_id": patient_id} if patient_id else {}
    return await db.lab_reports.find(q, {"_id": 0, "file_data": 0}).sort("collected_at", -1).to_list(300)
