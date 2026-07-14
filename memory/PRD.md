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

## Implemented (Feb 2026)
- Marketing: Landing (hero + animated stats + how-it-works + benefits + why-us + featured doctors + testimonials + pricing preview + FAQ + CTA + footer), About, Programs list + detail, Doctor directory with search, Pricing with comparison table, Blog list with category filter + detail, Support/Contact form, Newsletter.
- Auth: Emergent Google OAuth via `/auth/session`, `/auth/me`, `/auth/logout`, httpOnly cookie, protected routes with role gating.
- AI Assessment: Aria conversational intake (Claude Sonnet 4.5), session-scoped memory.
- Patient Dashboard: Health metric cards, weight progress chart (Recharts), daily check-in dialog, appointment booking dialog, goal creation, medication schedule stub, weekly plate.
- Doctor Dashboard: Today's schedule, active patients list, note counters.
- Admin Dashboard: Platform metrics, sign-up chart, users list, appointments list.
- Public content API: doctors, programs, plans, testimonials, blog, faqs, platform-stats, contact, newsletter.
- Seed script runs on backend startup.
- Full test coverage: 32/32 backend tests passing; all frontend flows verified.

## Backlog (P0/P1/P2)
- P0: Stripe checkout for subscriptions (currently display-only).
- P0: Real prescription management + medication ordering + delivery tracking on Patient/Doctor dashboards.
- P1: Multi-step visitor onboarding wizard (currently AI chat only).
- P1: Diagnostics module (book lab tests, upload/view lab reports, trend charts).
- P1: In-platform messaging between patient ↔ doctor.
- P1: Doctor consultation notes + follow-up scheduling.
- P2: Live chat support widget, ticket tracking.
- P2: Content management for admin (blog authoring, program editing).
- P2: Notifications & achievements gamification.
- P2: Cookie-consent banner, WCAG audit, App download CTA blocks.

## Next Tasks
1. Wire Stripe checkout for plans and start subscription lifecycle.
2. Build diagnostics upload + lab review workflow.
3. Add patient ↔ doctor messaging thread.
4. Doctor consultation note templates + follow-up scheduling.
