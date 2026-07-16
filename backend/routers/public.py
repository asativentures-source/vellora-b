"""Public marketing content, contact, and newsletter."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

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


class ContactCreate(BaseModel):
    name: str
    email: str
    message: str
    topic: Optional[str] = "general"

@router.post("/contact")
async def submit_contact(c: ContactCreate):
    doc = c.model_dump()
    doc.update({"id": uid("msg"), "created_at": now_iso(), "status": "open"})
    await db.contact_messages.insert_one(doc)
    return {"ok": True, "id": doc["id"]}

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
