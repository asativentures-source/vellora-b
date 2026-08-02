"""Verdia GLP-1 Care Platform — FastAPI entrypoint.

All feature endpoints live in routers/*.py. This file wires the app, CORS,
startup (seed data + indexes + admin owner), and shutdown."""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from deps import (
    db, client, logger, uid, now_iso,
    hash_password, verify_password,
    CORS_ORIGINS, ADMIN_EMAIL, ADMIN_PASSWORD,
)
from routers import auth, public, patient, diagnostics, messages, doctor, admin, ai, onboarding, seed as seed_router

app = FastAPI(title="vellora360 GLP-1 Care Platform API")

# Single /api-prefixed router aggregating all feature routers.
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(public.router)
api_router.include_router(patient.router)
api_router.include_router(diagnostics.router)
api_router.include_router(messages.router)
api_router.include_router(doctor.router)
api_router.include_router(admin.router)
api_router.include_router(ai.router)
api_router.include_router(onboarding.router)
api_router.include_router(seed_router.router)
ping_router = APIRouter(prefix="/ping")

@ping_router.get("")
async def ping():
    return {"message": "pong"}

api_router.include_router(ping_router)

@api_router.get("/")
async def root():
    return {"service": "vellora360 GLP-1 Care Platform", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # 1) Seed public content (idempotent).
    try:
        await seed_router.run_seed()
        logger.info("Seed data ensured")
    except Exception as e:
        logger.exception(f"Seed failed: {e}")

    # 2) Auth-related indexes.
    try:
        await db.users.create_index("email", unique=True, sparse=True)
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
        await db.login_attempts.create_index("identifier", unique=True)
        await db.refresh_sessions.create_index("jti", unique=True)
        await db.refresh_sessions.create_index("user_id")
        await db.refresh_sessions.create_index("expires_at", expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")

    # 3) Admin owner seed (idempotent).
    try:
        if ADMIN_EMAIL and ADMIN_PASSWORD:
            hashed = hash_password(ADMIN_PASSWORD)
            existing = await db.users.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
            if not existing:
                await db.users.insert_one({
                    "user_id": uid("user"),
                    "email": ADMIN_EMAIL,
                    "name": "Owner",
                    "picture": "",
                    "role": "admin",
                    "password_hash": hashed,
                    "created_at": now_iso(),
                })
                logger.info(f"Admin user seeded: {ADMIN_EMAIL}")
            else:
                updates = {}
                if existing.get("role") != "admin":
                    updates["role"] = "admin"
                if not existing.get("password_hash") or not verify_password(ADMIN_PASSWORD, existing.get("password_hash", "")):
                    updates["password_hash"] = hashed
                if updates:
                    await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": updates})
                    logger.info(f"Admin user updated: {ADMIN_EMAIL}")
    except Exception as e:
        logger.exception(f"Admin seed failed: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
