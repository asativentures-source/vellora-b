"""Admin endpoints (all require admin role)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from deps import db, require_admin
from datetime import datetime

router = APIRouter(prefix="/admin")

class StatusUpdate(BaseModel):
    status: str            # e.g., "pending", "called", "busy", "no_response", "call_later"
    note: Optional[str] = None      # Admin ka custom remark/reason
    follow_up_date: Optional[str] = None  # Format: "YYYY-MM-DD" agar baad me call karna ho

@router.get("/contact-messages")
async def get_admin_contact_messages(
    skip: int = 0, 
    limit: int = 10, 
    topic: str = None, 
    search: str = None, 
    start_date: str = None,  
    end_date: str = None,    
    status: str = None,     # Status-wise filter (e.g., pending, busy, call_later)
    follow_up_date: str = None, # Specific follow-up date filter
    admin=Depends(require_admin)
):
    query = {}
    if topic:
        query["topic"] = topic
    if status == "pending":
        query["$or"] = [
        {"status": "pending"},
        {"status": {"$exists": False}},
        {"status": None}
    ]
    elif status:
        query["status"] = status
    if follow_up_date:
        query["follow_up_date"] = follow_up_date
        
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    # Created date range filtering logic
    if start_date or end_date:
        query["created_at"] = {}
        if start_date:
            query["created_at"]["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query["created_at"]["$lte"] = end_dt

    messages = await db.contact_messages.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total_count = await db.contact_messages.count_documents(query)
    
    return {
        "messages": messages,
        "total": total_count
    }


@router.patch("/contact-messages/{phone}/status")
async def update_message_status(phone: str, body: StatusUpdate, admin=Depends(require_admin)):
    update_data = {
        "status": body.status,
        "note": body.note,
        "updated_at": datetime.utcnow()
    }
    if body.follow_up_date:
        update_data["follow_up_date"] = body.follow_up_date

    result = await db.contact_messages.update_one(
        {"phone": phone}, 
        {"$set": update_data}
    )
    if result.matched_count == 0:
        return {"error": "Message not found"}
    return {"success": True, "data": update_data}


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