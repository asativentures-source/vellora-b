"""Seed data for public content + optional POST /seed idempotent endpoint."""
from fastapi import APIRouter

from deps import db, uid, now_iso

router = APIRouter()

DOCTORS = [
    {"name": "Dr. Aisha Rahman", "specialty": "Endocrinology & Metabolic Health", "experience_years": 14, "languages": ["English", "Urdu", "Hindi"], "rating": 4.9, "consultations": 2380, "picture": "https://images.pexels.com/photos/6749765/pexels-photo-6749765.jpeg", "bio": "Board-certified endocrinologist specializing in GLP-1 therapies and metabolic syndrome.", "available_slots": ["Mon 10:00", "Tue 14:00", "Thu 09:30"]},
    {"name": "Dr. Marcus Chen", "specialty": "Obesity Medicine", "experience_years": 11, "languages": ["English", "Mandarin"], "rating": 4.8, "consultations": 1890, "picture": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d", "bio": "Diplomate of American Board of Obesity Medicine. Passionate about sustainable weight loss.", "available_slots": ["Wed 11:00", "Fri 15:00"]},
    {"name": "Dr. Priya Menon", "specialty": "PCOS & Women's Metabolic Health", "experience_years": 9, "languages": ["English", "Hindi", "Malayalam"], "rating": 5.0, "consultations": 1240, "picture": "https://images.unsplash.com/photo-1594824476967-48c8b964273f", "bio": "Focused on PCOS, insulin resistance, and hormonal balance for long-term wellness.", "available_slots": ["Tue 10:00", "Thu 16:00"]},
    {"name": "Dkr. Samuel Okafor", "specialty": "Diabetes & Cardiometabolic", "experience_years": 17, "languages": ["English", "French"], "rating": 4.9, "consultations": 3120, "picture": "https://images.unsplash.com/photo-1537368910025-700350fe46c7", "bio": "Type 2 diabetes remission expert. Integrating GLP-1 with lifestyle medicine.", "available_slots": ["Mon 09:00", "Wed 13:00"]},
    {"name": "Dr. Elena Rossi", "specialty": "Clinical Nutrition & Bariatrics", "experience_years": 12, "languages": ["English", "Italian", "Spanish"], "rating": 4.9, "consultations": 1670, "picture": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2", "bio": "Bariatric physician with a nutrition-first, medication-supported approach.", "available_slots": ["Fri 10:00", "Sat 12:00"]},
    {"name": "Dr. Jonas Lindqvist", "specialty": "Metabolic Health & Sleep", "experience_years": 15, "languages": ["English", "Swedish"], "rating": 4.7, "consultations": 980, "picture": "https://images.unsplash.com/photo-1622253692010-333f2da6031d", "bio": "Combines GLP-1 therapy with sleep and circadian optimization.", "available_slots": ["Mon 15:00", "Thu 11:00"]},
]

PROGRAMS = [
    {"slug": "weight-loss", "title": "GLP-1 Weight Loss Program", "tagline": "Medically supervised, science-backed weight loss.", "eligibility": ["BMI ≥ 27 with comorbidities", "BMI ≥ 30", "Age 18–70"], "outcomes": ["8–20% body weight reduction in 6–12 months", "Improved waist circumference and lipid profile", "Sustainable habit change"], "timeline": "12 months, monthly follow-ups", "steps": ["Health assessment", "Doctor consultation", "Personalized GLP-1 plan", "Nutrition & coaching", "Progress tracking"], "hero_image": "https://images.pexels.com/photos/8173483/pexels-photo-8173483.jpeg", "starting_price": 149},
    {"slug": "diabetes", "title": "Type 2 Diabetes Management", "tagline": "Lower HbA1c. Reduce medication burden. Reclaim control.", "eligibility": ["HbA1c ≥ 6.5%", "Age 18–75", "T2D or prediabetes"], "outcomes": ["1–2% HbA1c reduction", "Weight reduction 5–15%", "Cardiovascular risk lowering"], "timeline": "12–24 months, quarterly labs", "steps": ["Lab review", "Endocrinologist consult", "GLP-1 titration", "CGM optional", "Ongoing coaching"], "hero_image": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56", "starting_price": 199},
    {"slug": "pcos", "title": "PCOS Metabolic Program", "tagline": "Restore cycles. Improve insulin sensitivity. Feel yourself again.", "eligibility": ["PCOS diagnosis", "Insulin resistance signs", "Age 18–45"], "outcomes": ["Menstrual regularity in 60–70% cases", "Reduced androgens, improved skin & hair", "Weight and waist reduction"], "timeline": "9–12 months", "steps": ["Hormone & metabolic panel", "PCOS specialist consult", "GLP-1 + inositol protocol", "Nutrition & movement", "Cycle tracking"], "hero_image": "https://images.unsplash.com/photo-1544027993-37dbfe43562a", "starting_price": 179},
    {"slug": "metabolic", "title": "Metabolic Health Optimization", "tagline": "For high-performers who want longevity and clarity.", "eligibility": ["Metabolic syndrome markers", "Prediabetes", "Executive health seekers"], "outcomes": ["Improved fasting insulin & triglycerides", "Body composition improvement", "Better energy and sleep"], "timeline": "6–12 months", "steps": ["Advanced diagnostics", "Physician-led plan", "Micro-dose GLP-1 (as indicated)", "Executive coaching", "Quarterly reviews"], "hero_image": "https://images.unsplash.com/photo-1571902943202-507ec2618e8f", "starting_price": 249},
]

PLANS = [
    {"code": "monthly", "name": "Monthly", "price": 149, "period": "per month", "features": {"doctor_consults": 1, "nutrition_coaching": True, "medication_support": True, "progress_tracking": True, "lab_integration": False, "priority_support": False}, "highlight": False},
    {"code": "quarterly", "name": "Quarterly", "price": 129, "period": "per month, billed quarterly", "features": {"doctor_consults": 3, "nutrition_coaching": True, "medication_support": True, "progress_tracking": True, "lab_integration": True, "priority_support": False}, "highlight": True, "badge": "Most Popular"},
    {"code": "annual", "name": "Annual", "price": 99, "period": "per month, billed annually", "features": {"doctor_consults": 12, "nutrition_coaching": True, "medication_support": True, "progress_tracking": True, "lab_integration": True, "priority_support": True}, "highlight": False, "badge": "Best Value"},
]

TESTIMONIALS = [
    {"name": "Sarah M.", "age": 42, "outcome": "Lost 18 kg in 9 months", "quote": "The doctor took the time to understand my history. The plan was personalized, not cookie-cutter. My energy is back.", "picture": "https://images.unsplash.com/photo-1544005313-94ddf0286df2", "program": "Weight Loss"},
    {"name": "Marcus T.", "age": 51, "outcome": "HbA1c 8.9 → 6.1", "quote": "For the first time in a decade, my numbers are in range. My team feels like a partner, not a prescription pad.", "picture": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", "program": "Diabetes"},
    {"name": "Ananya K.", "age": 29, "outcome": "Regular cycles restored", "quote": "PCOS ruled my life for years. The metabolic approach here — not just birth control — changed everything.", "picture": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2", "program": "PCOS"},
    {"name": "Diego F.", "age": 47, "outcome": "Lost 12 kg, sleeps 7h", "quote": "As a founder, I don't have time for guesswork. The dashboard and coach kept me consistent through travel.", "picture": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e", "program": "Metabolic"},
]

BLOG = [
    {"slug": "what-is-glp1", "title": "What is GLP-1 and how does it work?", "category": "GLP-1 Education", "excerpt": "A plain-English guide to how GLP-1 receptor agonists support appetite regulation and metabolic health.", "content": "GLP-1 (glucagon-like peptide-1) is a hormone naturally released after meals...", "author": "Dr. Aisha Rahman", "read_min": 6, "cover": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063"},
    {"slug": "protein-first-plate", "title": "The protein-first plate: nutrition on GLP-1", "category": "Nutrition", "excerpt": "How to structure meals to preserve lean mass while losing fat.", "content": "Building meals around protein...", "author": "Dr. Elena Rossi", "read_min": 5, "cover": "https://images.unsplash.com/photo-1494859802809-d069c3b71a8a"},
    {"slug": "walk-not-marathon", "title": "Why walking beats marathons for metabolic health", "category": "Fitness", "excerpt": "Zone-2 movement, NEAT, and the underrated power of a daily walk.", "content": "Consistent low-intensity movement...", "author": "Dr. Jonas Lindqvist", "read_min": 4, "cover": "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c"},
    {"slug": "pcos-metabolic-lens", "title": "PCOS through a metabolic lens", "category": "Medical Research", "excerpt": "The insulin resistance connection and what current evidence tells us.", "content": "Recent studies suggest...", "author": "Dr. Priya Menon", "read_min": 7, "cover": "https://images.unsplash.com/photo-1584982751601-97dcc096659c"},
    {"slug": "sarah-story", "title": "Sarah's story: 18 kg down, life reclaimed", "category": "Success Stories", "excerpt": "How a busy mom of two rebuilt her routine — and her confidence.", "content": "Sarah's journey started...", "author": "Editorial Team", "read_min": 5, "cover": "https://images.unsplash.com/photo-1544005313-94ddf0286df2"},
    {"slug": "sleep-and-glp1", "title": "Sleep is the sixth vital sign for weight loss", "category": "Lifestyle", "excerpt": "Poor sleep sabotages appetite hormones. Here's the fix.", "content": "Sleep debt raises ghrelin...", "author": "Dr. Jonas Lindqvist", "read_min": 5, "cover": "https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f"},
]

FAQS = [
    {"q": "Is GLP-1 therapy safe long-term?", "a": "GLP-1 medications have been studied for over 15 years in diabetes and are now approved for weight management. Under supervision, safety profiles are well characterized."},
    {"q": "Do I need to inject the medication?", "a": "Most GLP-1 medications are once-weekly subcutaneous injections with a small pen device. Some oral options exist."},
    {"q": "Will my insurance cover treatment?", "a": "Coverage varies. Our team helps verify benefits and offers self-pay options with transparent pricing."},
    {"q": "How fast will I lose weight?", "a": "Most patients notice appetite changes in weeks. Meaningful weight loss typically appears at 3–6 months, with continued progress through 12 months."},
    {"q": "Can I stop the medication?", "a": "Yes, with a taper plan. Sustained results depend on the lifestyle habits you build during the program."},
    {"q": "Do you support PCOS and diabetes together?", "a": "Yes. Our clinicians address the metabolic root causes across conditions."},
]

LAB_TESTS = [
    {"code": "hba1c", "name": "HbA1c", "description": "Average blood glucose over 3 months.", "sample": "Blood", "price": 29, "turnaround": "24 hours", "markers": ["HbA1c"], "unit": "%"},
    {"code": "lipid", "name": "Lipid Panel", "description": "Cholesterol, LDL, HDL, triglycerides.", "sample": "Blood", "price": 39, "turnaround": "24 hours", "markers": ["Total Cholesterol", "LDL", "HDL", "Triglycerides"], "unit": "mg/dL"},
    {"code": "fasting-insulin", "name": "Fasting Insulin + HOMA-IR", "description": "Insulin resistance screening.", "sample": "Blood (fasting)", "price": 49, "turnaround": "48 hours", "markers": ["Fasting Insulin", "Glucose", "HOMA-IR"], "unit": "µIU/mL"},
    {"code": "thyroid", "name": "Thyroid Panel", "description": "TSH, Free T3, Free T4.", "sample": "Blood", "price": 45, "turnaround": "24 hours", "markers": ["TSH", "Free T3", "Free T4"], "unit": "mIU/L"},
    {"code": "pcos-hormones", "name": "PCOS Hormone Panel", "description": "LH, FSH, testosterone, SHBG, AMH.", "sample": "Blood", "price": 69, "turnaround": "72 hours", "markers": ["LH", "FSH", "Testosterone", "SHBG", "AMH"], "unit": "varies"},
    {"code": "metabolic-panel", "name": "Comprehensive Metabolic Panel", "description": "Kidney, liver, glucose, electrolytes.", "sample": "Blood", "price": 55, "turnaround": "24 hours", "markers": ["Glucose", "Creatinine", "ALT", "AST"], "unit": "varies"},
]

PLATFORM_STATS = {"patients_served": 42800, "kg_lost": 189000, "doctors_onboarded": 128, "success_rate": 92}


async def run_seed():
    """Idempotent seed. Safe to call on every startup."""
    if await db.doctors.count_documents({}) == 0:
        await db.doctors.insert_many([{**d, "doctor_id": uid("doc")} for d in DOCTORS])
    if await db.programs.count_documents({}) == 0:
        await db.programs.insert_many([{**p} for p in PROGRAMS])
    if await db.plans.count_documents({}) == 0:
        await db.plans.insert_many([{**p} for p in PLANS])
    if await db.testimonials.count_documents({}) == 0:
        await db.testimonials.insert_many([{**t, "id": uid("t")} for t in TESTIMONIALS])
    if await db.blog_posts.count_documents({}) == 0:
        await db.blog_posts.insert_many([{**b, "published_at": now_iso()} for b in BLOG])
    if await db.faqs.count_documents({}) == 0:
        await db.faqs.insert_many([{**f} for f in FAQS])
    if await db.lab_tests.count_documents({}) == 0:
        await db.lab_tests.insert_many([{**t} for t in LAB_TESTS])
    if await db.platform_stats.count_documents({}) == 0:
        await db.platform_stats.insert_one(PLATFORM_STATS)
    return {"ok": True, "seeded": True}


@router.post("/seed")
async def seed():
    return await run_seed()
