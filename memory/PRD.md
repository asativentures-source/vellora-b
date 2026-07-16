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
