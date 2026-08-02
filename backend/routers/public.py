"""Public marketing content, contact, and newsletter."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import re
from pydantic import field_validator
from deps import db, uid, now_iso

router = APIRouter()

@router.get("/doctors")
async def list_doctors():
    return await db.doctors.find({}, {"_id": 0}).to_list(200)

@router.get("/programs")
async def list_programs():
    return await db.programs.find({}, {"_id": 0}).to_list(50)

@router.get("/plans")
async def list_plans():
    return await db.plans.find({}, {"_id": 0}).to_list(50)

@router.get("/testimonials")
async def list_testimonials():
    return await db.testimonials.find({}, {"_id": 0}).to_list(50)

@router.get("/blog")
async def list_blog(category: Optional[str] = None):
    q = {"category": category} if category else {}
    return await db.blog_posts.find(q, {"_id": 0}).to_list(100)

@router.get("/blog/{slug}")
async def get_blog(slug: str):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Not found")
    return post

@router.get("/faqs")
async def list_faqs():
    return await db.faqs.find({}, {"_id": 0}).to_list(50)

@router.get("/platform-stats")
async def platform_stats():
    return await db.platform_stats.find_one({}, {"_id": 0}) or {}


import re
from pydantic import field_validator

class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: str  
    message: Optional[str] = None
    topic: Optional[str] = "general"

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Spaces aur symbols hata kar check karein ki sirf valid digits hain ya nahi
        cleaned = re.sub(r'[\s\-\(\)]', '', v)
        if not re.match(r'^\+?[0-9]{10,15}$', cleaned):
            raise ValueError("Invalid phone number format.")
        return v

@router.post("/contact")
async def submit_contact_message(data: ContactCreate):
    message_data = data.model_dump() # Pydantic v2 ke liye model_dump() use karein (ya dict())
    message_data.update({
        "id": uid("msg"), 
        "status": "pending",  # <--- Default status pending set kar diya hai
        "created_at": datetime.utcnow()
    })
    
    await db.contact_messages.insert_one(message_data)
    return {"success": True, "message": "Enquiry submitted successfully", "id": message_data["id"]}

class NewsletterSub(BaseModel):
    email: str

@router.post("/newsletter")
async def newsletter(n: NewsletterSub):
    await db.newsletter.update_one(
        {"email": n.email},
        {"$set": {"email": n.email, "subscribed_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}