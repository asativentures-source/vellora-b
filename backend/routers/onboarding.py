"""Visitor onboarding wizard submission — returns BMI + recommended program."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from deps import db, uid, now_iso

router = APIRouter()

class OnboardingSubmit(BaseModel):
    goal: str
    conditions: List[str] = []
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    medications: Optional[str] = None
    lifestyle: Optional[str] = None
    preferred_program: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None

@router.post("/onboarding")
async def submit_onboarding(o: OnboardingSubmit):
    bmi = None
    if o.weight_kg and o.height_cm and o.height_cm > 0:
        bmi = round(o.weight_kg / ((o.height_cm / 100) ** 2), 1)
    doc = o.model_dump()
    doc.update({"id": uid("onb"), "bmi": bmi, "created_at": now_iso()})
    await db.onboarding_submissions.insert_one(doc)
    doc.pop("_id", None)

    conds = [c.lower() for c in o.conditions]
    if "pcos" in conds:
        rec = "pcos"
    elif "diabetes" in " ".join(conds):
        rec = "diabetes"
    elif any("metabolic" in c for c in conds):
        rec = "metabolic"
    else:
        rec = "weight-loss"
    return {"submission": doc, "recommended_program": rec, "bmi": bmi}
