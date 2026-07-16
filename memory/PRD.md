# Verdia — GLP-1 Care Platform PRD

## Original Problem
Premium healthcare website + full multi-role platform for GLP-1 obesity and metabolic health management (weight loss, diabetes, PCOS, metabolic). Marketing site + patient dashboard + doctor dashboard + admin dashboard. Apple-inspired minimalism, soft blue/green/white palette, glass-morphism sparingly, subtle micro-animations. Trustworthy, clinical, calming.

## User Choices
- Full multi-role platform (marketing + patient + doctor + admin)
- Emergent-managed Google OAuth (first user auto-admin; emails starting with `dr.` → doctor role)
- Seeded realistic mock data (6 doctors, 4 programs, 3 plans, 6 blog posts, 6 FAQs, 4 testimonials)
- Display-only pricing (no live checkout in v1)
- AI Health Assessment chatbot via Claude Sonnet 4.5 (emergentintegrations)

## User Personas
- Adults with obesity/overweight, T2 diabetes, PCOS, metabolic syndrome, busy professionals
- Clinicians (endocrinology, obesity medicine, PCOS specialists)
- Platform admins

## Architecture
- Backend: FastAPI + Motor/MongoDB, prefix `/api`. Emergent OAuth session exchange. Claude Sonnet 4.5 via `emergentintegrations`.
- Frontend: React 19 + React Router 7 + Tailwind + shadcn/ui + Recharts + lucide + Framer Motion utilities.
- Fonts: Cormorant Garamond (serif marketing) + Manrope (UI/dashboard).
- Palette: Sage/pine (primary #3B6B56), slate secondary, accent #E8F0EB.

### Feb 2026 — Iteration 5
- **Fresh-session re-auth guard**: `/auth/add-password` now requires the caller's `last_auth_at` to be within `FRESH_AUTH_WINDOW_MIN` (10 min). `last_auth_at` is stamped on register/login/Google `/auth/session`, **not** on `/auth/refresh` (rotating a token does not extend the fresh window). Stale denials are logged with `[fresh-auth]` for audit. Settings page shows an amber banner + disabled submit + "Re-authenticate →" link when stale.
- **Backend refactor**: `server.py` shrunk 1066 → 98 lines. New layout:
  - `deps.py` — db, crypto, JWT, cookies, `get_current_user`, `require_fresh_auth`, role guards
  - `routers/auth.py` — Google + JWT + settings
  - `routers/{public,patient,diagnostics,messages,doctor,admin,ai,onboarding,seed}.py`
  - Seed is now an idempotent `run_seed()` invoked on startup.
- Testing: **115/115 backend tests** (32+19+18+21+25) + full frontend regression + fresh-auth flows verified (stale rejected, fresh accepted, UI banner + disabled submit). Zero critical bugs.

### Feb 2026 — Iteration 4
- **Refresh-token rotation** with server-side jti tracking (`refresh_sessions` collection). Every `/auth/refresh` issues a new access + new refresh token, deletes the old jti, and revokes the entire family if a reused/stolen token is presented (logged as WARNING). TTL index auto-cleans expired jti rows.
- **Password reset / change** now also revokes all of the user's refresh sessions to force re-login across devices.
- **`/auth/add-password`** endpoint lets Google-only users attach a password (authenticated only, 409 if a password already exists). **`/auth/change-password`** requires the current password.
- **`/auth/security`** endpoint returns has_password / has_google / active session counts.
- New **`/settings` page** (protected): Profile card + Security card with Google/Email status pills, contextual Add-password form (Google-only) or Change-password form, and active session counters. Settings links added to Navbar dropdown and all three dashboard sidebars.
- Testing: **90/90 backend tests** (32+19+18+21) + full frontend flows passed.

### Feb 2026 — Iteration 3
- **JWT email/password authentication** coexisting with Google OAuth. Same `/auth/me` and `/auth/logout` work for both credential types.
- New endpoints: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`. bcrypt(12), httpOnly `access_token` (12h) + `refresh_token` (30d) cookies, secure + samesite=none.
- Brute-force protection (5 fails / 15 min lockout) via `login_attempts` collection with atomic `$inc`.
- **Admin owner** `aasati444@gmail.com` / `Verdia@Admin2026` seeded idempotently on startup.
- Password reset link logged to backend logs (`[PASSWORD RESET]`), rate-limit-friendly.
- Register refuses to attach a password to an existing Google-only account (prevents hijack).
- New `/login` page: Google button + divider + Sign-in / Create-account tabs. Navbar and Assessment now route to `/login`.
- Frontend `formatApiErrorDetail` helper prevents React crashes on 422 validation arrays.
- Testing: **69/69 backend tests** (32 iter1 + 19 iter2 + 18 iter3) + 10/10 frontend flows passed.

## Implemented
### Feb 2026 — Iteration 1 (MVP)
- Marketing: Landing, About, Programs list + detail, Doctor directory with search, Pricing with comparison table, Blog list + detail, Support/Contact, Newsletter.
- Auth: Emergent Google OAuth (`/auth/session`, `/auth/me`, `/auth/logout`), role gating (patient/doctor/admin).
- AI Assessment page: Aria conversational intake (Claude Sonnet 4.5).
- Patient Dashboard: metric cards, weight chart, check-in, appointment booking, goals.
- Doctor Dashboard: schedule, patient list.
- Admin Dashboard: platform metrics, sign-ups chart, users, appointments.
- Seed script runs on backend startup.

### Feb 2026 — Iteration 2
- **Diagnostics module**: `/api/lab-tests` catalog (6 seeded), `/api/patient/lab-order` booking, `/api/patient/lab-report` upload (base64 file + parsed marker values), marker trend charts (Recharts). Doctor-side view via `/api/doctor/lab-reports`.
- **Messaging**: deterministic thread IDs, `POST /api/messages`, `/messages/thread`, `/messages/threads` with unread counts. Shared Messages page for patient & doctor with real-time thread + auto-mark-read.
- **Doctor SOAP notes**: `/api/doctor/note` create + list, follow-up datetime, patient labs viewer in Notes page.
- **Multi-step onboarding wizard** (`/onboarding`): 5 steps (goal → conditions → vitals → medications/lifestyle → contact); returns BMI + recommended program (PCOS wins on overlap).
- **Cookie consent** banner (localStorage `verdia_cookie_consent_v1`).
- **Live chat widget** (Aria) — FAB on all marketing pages, hidden on dashboards.
- Testing: 51/51 backend tests + full frontend flows passed.

## Backlog (P0/P1/P2)
- P0: Stripe checkout for subscriptions.
- P0: Real medication ordering + delivery tracking.
- P1: Doctor consultation note templates + reusable phrases.
- P1: In-message file attachments; typing indicators.
- P1: Lab report OCR (auto-extract values).
- P2: Admin content management for blog + programs.
- P2: Notifications & achievements gamification.
- P2: WCAG audit + app download blocks.

## Next Tasks
1. Wire Stripe checkout for the 3 subscription tiers.
2. Medication ordering + delivery/cold-chain tracking.
3. Doctor note templates + reusable macros.
