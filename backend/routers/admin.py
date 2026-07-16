"""Admin endpoints (all require admin role)."""
from fastapi import APIRouter, Depends

from deps import db, require_admin

router = APIRouter(prefix="/admin")

@router.get("/stats")
async def admin_stats(user=Depends(require_admin)):
    users = await db.users.count_documents({})
    doctors = await db.doctors.count_documents({})
    appts = await db.appointments.count_documents({})
    orders = await db.orders.count_documents({}) if "orders" in await db.list_collection_names() else 0
    return {"users": users, "doctors": doctors, "appointments": appts, "orders": orders}

@router.get("/users")
async def admin_users(user=Depends(require_admin)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)

@router.get("/appointments")
async def admin_appts(user=Depends(require_admin)):
    return await db.appointments.find({}, {"_id": 0}).sort("scheduled_at", -1).to_list(500)
