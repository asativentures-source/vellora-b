from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="GLP-1 Care Platform API")
api_router = APIRouter(prefix="/api")

# ---------- Helpers ----------
def uid(prefix="id"):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(default=None)
):
    token = session_token
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = sess["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ---------- Models ----------
class SessionRequest(BaseModel):
    session_id: str

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

class AssessmentMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

# ---------- Auth ----------
@api_router.post("/auth/session")
async def create_session(payload: SessionRequest, response: Response):
    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data["email"]
    name = data.get("name", email)
    picture = data.get("picture", "")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        role = existing.get("role", "patient")
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login": now_iso()}}
        )
    else:
        user_id = uid("user")
        # First user becomes admin, doctors detected by email prefix "dr."
        role = "patient"
        if email.startswith("dr.") or "@doctors." in email:
            role = "doctor"
        count = await db.users.count_documents({})
        if count == 0:
            role = "admin"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "created_at": now_iso(),
            "last_login": now_iso(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_iso(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user, "session_token": session_token}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------- Public content ----------
@api_router.get("/doctors")
async def list_doctors():
    docs = await db.doctors.find({}, {"_id": 0}).to_list(200)
    return docs

@api_router.get("/programs")
async def list_programs():
    return await db.programs.find({}, {"_id": 0}).to_list(50)

@api_router.get("/plans")
async def list_plans():
    return await db.plans.find({}, {"_id": 0}).to_list(50)

@api_router.get("/testimonials")
async def list_testimonials():
    return await db.testimonials.find({}, {"_id": 0}).to_list(50)

@api_router.get("/blog")
async def list_blog(category: Optional[str] = None):
    q = {"category": category} if category else {}
    return await db.blog_posts.find(q, {"_id": 0}).to_list(100)

@api_router.get("/blog/{slug}")
async def get_blog(slug: str):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Not found")
    return post

@api_router.get("/faqs")
async def list_faqs():
    return await db.faqs.find({}, {"_id": 0}).to_list(50)

@api_router.get("/platform-stats")
async def platform_stats():
    return await db.platform_stats.find_one({}, {"_id": 0}) or {}


# ---------- Contact / Newsletter ----------
class ContactCreate(BaseModel):
    name: str
    email: str
    message: str
    topic: Optional[str] = "general"

@api_router.post("/contact")
async def submit_contact(c: ContactCreate):
    doc = c.model_dump()
    doc["id"] = uid("msg")
    doc["created_at"] = now_iso()
    doc["status"] = "open"
    await db.contact_messages.insert_one(doc)
    return {"ok": True, "id": doc["id"]}

class NewsletterSub(BaseModel):
    email: str

@api_router.post("/newsletter")
async def newsletter(n: NewsletterSub):
    await db.newsletter.update_one(
        {"email": n.email},
        {"$set": {"email": n.email, "subscribed_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


# ---------- Patient ----------
@api_router.get("/patient/dashboard")
async def patient_dashboard(user=Depends(get_current_user)):
    uid_ = user["user_id"]
    metrics = await db.health_metrics.find({"user_id": uid_}, {"_id": 0}).sort("recorded_at", 1).to_list(200)
    appts = await db.appointments.find({"patient_id": uid_}, {"_id": 0}).sort("scheduled_at", 1).to_list(50)
    meds = await db.medications.find({"user_id": uid_}, {"_id": 0}).to_list(50)
    goals = await db.goals.find({"user_id": uid_}, {"_id": 0}).to_list(50)
    return {"metrics": metrics, "appointments": appts, "medications": meds, "goals": goals}

@api_router.post("/patient/checkin")
async def add_checkin(c: HealthCheckIn, user=Depends(get_current_user)):
    doc = c.model_dump()
    doc.update({
        "id": uid("chk"),
        "user_id": user["user_id"],
        "recorded_at": now_iso(),
    })
    await db.health_metrics.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.post("/patient/appointment")
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

class GoalCreate(BaseModel):
    title: str
    target: str
    due_date: Optional[str] = None

@api_router.post("/patient/goal")
async def add_goal(g: GoalCreate, user=Depends(get_current_user)):
    doc = g.model_dump()
    doc.update({"id": uid("goal"), "user_id": user["user_id"], "achieved": False, "created_at": now_iso()})
    await db.goals.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Doctor ----------
@api_router.get("/doctor/dashboard")
async def doctor_dashboard(user=Depends(get_current_user)):
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(403, "Not authorized")
    appts = await db.appointments.find({"doctor_id": user["user_id"]}, {"_id": 0}).sort("scheduled_at", 1).to_list(200)
    # Show all appointments to any doctor for demo, plus patients
    if not appts:
        appts = await db.appointments.find({}, {"_id": 0}).sort("scheduled_at", 1).to_list(50)
    patients = await db.users.find({"role": "patient"}, {"_id": 0}).to_list(100)
    return {"appointments": appts, "patients": patients}


# ---------- Admin ----------
@api_router.get("/admin/stats")
async def admin_stats(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    users = await db.users.count_documents({})
    doctors = await db.doctors.count_documents({})
    appts = await db.appointments.count_documents({})
    orders = await db.orders.count_documents({}) if "orders" in await db.list_collection_names() else 0
    return {"users": users, "doctors": doctors, "appointments": appts, "orders": orders}

@api_router.get("/admin/users")
async def admin_users(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return await db.users.find({}, {"_id": 0}).to_list(500)

@api_router.get("/admin/appointments")
async def admin_appts(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return await db.appointments.find({}, {"_id": 0}).sort("scheduled_at", -1).to_list(500)


# ---------- AI Assessment (Claude Sonnet 4.5) ----------
@api_router.post("/ai/assessment")
async def ai_assessment(payload: AssessmentMessage):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(500, f"AI unavailable: {e}")

    session_id = payload.session_id or uid("chat")
    system_message = (
        "You are Aria, a warm, empathetic, science-backed AI health assistant for a "
        "GLP-1 obesity and metabolic health platform. Ask 1 question at a time to "
        "gather: weight, height, health goals, medical history (diabetes, PCOS, "
        "thyroid, cardiovascular), current medications, dietary habits, and "
        "activity level. After 5-6 questions, provide a friendly summary and next "
        "steps: recommend booking a doctor consultation. Never diagnose. Never "
        "prescribe. Keep replies under 90 words. Use plain language."
    )
    chat = (
        LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_message)
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    )
    try:
        reply = await chat.send_message(UserMessage(text=payload.message))
    except Exception as e:
        logger.exception("AI chat failed")
        raise HTTPException(500, f"AI error: {e}")
    return {"session_id": session_id, "reply": reply}


# ---------- Seed ----------
@api_router.post("/seed")
async def seed():
    if await db.doctors.count_documents({}) > 0:
        return {"ok": True, "message": "Already seeded"}

    doctors = [
        {"doctor_id": uid("doc"), "name": "Dr. Aisha Rahman", "specialty": "Endocrinology & Metabolic Health", "experience_years": 14, "languages": ["English", "Urdu", "Hindi"], "rating": 4.9, "consultations": 2380, "picture": "https://images.pexels.com/photos/6749765/pexels-photo-6749765.jpeg", "bio": "Board-certified endocrinologist specializing in GLP-1 therapies and metabolic syndrome.", "available_slots": ["Mon 10:00", "Tue 14:00", "Thu 09:30"]},
        {"doctor_id": uid("doc"), "name": "Dr. Marcus Chen", "specialty": "Obesity Medicine", "experience_years": 11, "languages": ["English", "Mandarin"], "rating": 4.8, "consultations": 1890, "picture": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d", "bio": "Diplomate of American Board of Obesity Medicine. Passionate about sustainable weight loss.", "available_slots": ["Wed 11:00", "Fri 15:00"]},
        {"doctor_id": uid("doc"), "name": "Dr. Priya Menon", "specialty": "PCOS & Women's Metabolic Health", "experience_years": 9, "languages": ["English", "Hindi", "Malayalam"], "rating": 5.0, "consultations": 1240, "picture": "https://images.unsplash.com/photo-1594824476967-48c8b964273f", "bio": "Focused on PCOS, insulin resistance, and hormonal balance for long-term wellness.", "available_slots": ["Tue 10:00", "Thu 16:00"]},
        {"doctor_id": uid("doc"), "name": "Dr. Samuel Okafor", "specialty": "Diabetes & Cardiometabolic", "experience_years": 17, "languages": ["English", "French"], "rating": 4.9, "consultations": 3120, "picture": "https://images.unsplash.com/photo-1537368910025-700350fe46c7", "bio": "Type 2 diabetes remission expert. Integrating GLP-1 with lifestyle medicine.", "available_slots": ["Mon 09:00", "Wed 13:00"]},
        {"doctor_id": uid("doc"), "name": "Dr. Elena Rossi", "specialty": "Clinical Nutrition & Bariatrics", "experience_years": 12, "languages": ["English", "Italian", "Spanish"], "rating": 4.9, "consultations": 1670, "picture": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2", "bio": "Bariatric physician with a nutrition-first, medication-supported approach.", "available_slots": ["Fri 10:00", "Sat 12:00"]},
        {"doctor_id": uid("doc"), "name": "Dr. Jonas Lindqvist", "specialty": "Metabolic Health & Sleep", "experience_years": 15, "languages": ["English", "Swedish"], "rating": 4.7, "consultations": 980, "picture": "https://images.unsplash.com/photo-1622253692010-333f2da6031d", "bio": "Combines GLP-1 therapy with sleep and circadian optimization.", "available_slots": ["Mon 15:00", "Thu 11:00"]},
    ]
    await db.doctors.insert_many(doctors)

    programs = [
        {"slug": "weight-loss", "title": "GLP-1 Weight Loss Program", "tagline": "Medically supervised, science-backed weight loss.", "eligibility": ["BMI ≥ 27 with comorbidities", "BMI ≥ 30", "Age 18–70"], "outcomes": ["8–20% body weight reduction in 6–12 months", "Improved waist circumference and lipid profile", "Sustainable habit change"], "timeline": "12 months, monthly follow-ups", "steps": ["Health assessment", "Doctor consultation", "Personalized GLP-1 plan", "Nutrition & coaching", "Progress tracking"], "hero_image": "https://images.pexels.com/photos/8173483/pexels-photo-8173483.jpeg", "starting_price": 149},
        {"slug": "diabetes", "title": "Type 2 Diabetes Management", "tagline": "Lower HbA1c. Reduce medication burden. Reclaim control.", "eligibility": ["HbA1c ≥ 6.5%", "Age 18–75", "T2D or prediabetes"], "outcomes": ["1–2% HbA1c reduction", "Weight reduction 5–15%", "Cardiovascular risk lowering"], "timeline": "12–24 months, quarterly labs", "steps": ["Lab review", "Endocrinologist consult", "GLP-1 titration", "CGM optional", "Ongoing coaching"], "hero_image": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56", "starting_price": 199},
        {"slug": "pcos", "title": "PCOS Metabolic Program", "tagline": "Restore cycles. Improve insulin sensitivity. Feel yourself again.", "eligibility": ["PCOS diagnosis", "Insulin resistance signs", "Age 18–45"], "outcomes": ["Menstrual regularity in 60–70% cases", "Reduced androgens, improved skin & hair", "Weight and waist reduction"], "timeline": "9–12 months", "steps": ["Hormone & metabolic panel", "PCOS specialist consult", "GLP-1 + inositol protocol", "Nutrition & movement", "Cycle tracking"], "hero_image": "https://images.unsplash.com/photo-1544027993-37dbfe43562a", "starting_price": 179},
        {"slug": "metabolic", "title": "Metabolic Health Optimization", "tagline": "For high-performers who want longevity and clarity.", "eligibility": ["Metabolic syndrome markers", "Prediabetes", "Executive health seekers"], "outcomes": ["Improved fasting insulin & triglycerides", "Body composition improvement", "Better energy and sleep"], "timeline": "6–12 months", "steps": ["Advanced diagnostics", "Physician-led plan", "Micro-dose GLP-1 (as indicated)", "Executive coaching", "Quarterly reviews"], "hero_image": "https://images.unsplash.com/photo-1571902943202-507ec2618e8f", "starting_price": 249},
    ]
    await db.programs.insert_many(programs)

    plans = [
        {"code": "monthly", "name": "Monthly", "price": 149, "period": "per month", "features": {"doctor_consults": 1, "nutrition_coaching": True, "medication_support": True, "progress_tracking": True, "lab_integration": False, "priority_support": False}, "highlight": False},
        {"code": "quarterly", "name": "Quarterly", "price": 129, "period": "per month, billed quarterly", "features": {"doctor_consults": 3, "nutrition_coaching": True, "medication_support": True, "progress_tracking": True, "lab_integration": True, "priority_support": False}, "highlight": True, "badge": "Most Popular"},
        {"code": "annual", "name": "Annual", "price": 99, "period": "per month, billed annually", "features": {"doctor_consults": 12, "nutrition_coaching": True, "medication_support": True, "progress_tracking": True, "lab_integration": True, "priority_support": True}, "highlight": False, "badge": "Best Value"},
    ]
    await db.plans.insert_many(plans)

    testimonials = [
        {"id": uid("t"), "name": "Sarah M.", "age": 42, "outcome": "Lost 18 kg in 9 months", "quote": "The doctor took the time to understand my history. The plan was personalized, not cookie-cutter. My energy is back.", "picture": "https://images.unsplash.com/photo-1544005313-94ddf0286df2", "program": "Weight Loss"},
        {"id": uid("t"), "name": "Marcus T.", "age": 51, "outcome": "HbA1c 8.9 → 6.1", "quote": "For the first time in a decade, my numbers are in range. My team feels like a partner, not a prescription pad.", "picture": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", "program": "Diabetes"},
        {"id": uid("t"), "name": "Ananya K.", "age": 29, "outcome": "Regular cycles restored", "quote": "PCOS ruled my life for years. The metabolic approach here — not just birth control — changed everything.", "picture": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2", "program": "PCOS"},
        {"id": uid("t"), "name": "Diego F.", "age": 47, "outcome": "Lost 12 kg, sleeps 7h", "quote": "As a founder, I don't have time for guesswork. The dashboard and coach kept me consistent through travel.", "picture": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e", "program": "Metabolic"},
    ]
    await db.testimonials.insert_many(testimonials)

    blog = [
        {"slug": "what-is-glp1", "title": "What is GLP-1 and how does it work?", "category": "GLP-1 Education", "excerpt": "A plain-English guide to how GLP-1 receptor agonists support appetite regulation and metabolic health.", "content": "GLP-1 (glucagon-like peptide-1) is a hormone naturally released after meals...", "author": "Dr. Aisha Rahman", "read_min": 6, "published_at": now_iso(), "cover": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063"},
        {"slug": "protein-first-plate", "title": "The protein-first plate: nutrition on GLP-1", "category": "Nutrition", "excerpt": "How to structure meals to preserve lean mass while losing fat.", "content": "Building meals around protein...", "author": "Dr. Elena Rossi", "read_min": 5, "published_at": now_iso(), "cover": "https://images.unsplash.com/photo-1494859802809-d069c3b71a8a"},
        {"slug": "walk-not-marathon", "title": "Why walking beats marathons for metabolic health", "category": "Fitness", "excerpt": "Zone-2 movement, NEAT, and the underrated power of a daily walk.", "content": "Consistent low-intensity movement...", "author": "Dr. Jonas Lindqvist", "read_min": 4, "published_at": now_iso(), "cover": "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c"},
        {"slug": "pcos-metabolic-lens", "title": "PCOS through a metabolic lens", "category": "Medical Research", "excerpt": "The insulin resistance connection and what current evidence tells us.", "content": "Recent studies suggest...", "author": "Dr. Priya Menon", "read_min": 7, "published_at": now_iso(), "cover": "https://images.unsplash.com/photo-1584982751601-97dcc096659c"},
        {"slug": "sarah-story", "title": "Sarah's story: 18 kg down, life reclaimed", "category": "Success Stories", "excerpt": "How a busy mom of two rebuilt her routine — and her confidence.", "content": "Sarah's journey started...", "author": "Editorial Team", "read_min": 5, "published_at": now_iso(), "cover": "https://images.unsplash.com/photo-1544005313-94ddf0286df2"},
        {"slug": "sleep-and-glp1", "title": "Sleep is the sixth vital sign for weight loss", "category": "Lifestyle", "excerpt": "Poor sleep sabotages appetite hormones. Here's the fix.", "content": "Sleep debt raises ghrelin...", "author": "Dr. Jonas Lindqvist", "read_min": 5, "published_at": now_iso(), "cover": "https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f"},
    ]
    await db.blog_posts.insert_many(blog)

    faqs = [
        {"q": "Is GLP-1 therapy safe long-term?", "a": "GLP-1 medications have been studied for over 15 years in diabetes and are now approved for weight management. Under supervision, safety profiles are well characterized."},
        {"q": "Do I need to inject the medication?", "a": "Most GLP-1 medications are once-weekly subcutaneous injections with a small pen device. Some oral options exist."},
        {"q": "Will my insurance cover treatment?", "a": "Coverage varies. Our team helps verify benefits and offers self-pay options with transparent pricing."},
        {"q": "How fast will I lose weight?", "a": "Most patients notice appetite changes in weeks. Meaningful weight loss typically appears at 3–6 months, with continued progress through 12 months."},
        {"q": "Can I stop the medication?", "a": "Yes, with a taper plan. Sustained results depend on the lifestyle habits you build during the program."},
        {"q": "Do you support PCOS and diabetes together?", "a": "Yes. Our clinicians address the metabolic root causes across conditions."},
    ]
    await db.faqs.insert_many(faqs)

    await db.platform_stats.insert_one({
        "patients_served": 42800,
        "kg_lost": 189000,
        "doctors_onboarded": 128,
        "success_rate": 92,
    })

    return {"ok": True, "seeded": True}


# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"service": "GLP-1 Care Platform", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_seed():
    if await db.doctors.count_documents({}) == 0:
        try:
            await seed()
            logger.info("Seed data loaded")
        except Exception as e:
            logger.exception(f"Seed failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
