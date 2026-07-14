# Emergent Auth Testing Playbook

See /app/memory/test_credentials.md for how to create a test session in MongoDB.

## Backend
- `POST /api/auth/session` with JSON `{session_id}` exchanges Emergent OAuth session for a persistent `session_token` (stored in httpOnly cookie).
- `GET /api/auth/me` returns current user via cookie or `Authorization: Bearer <token>` header.
- `POST /api/auth/logout` clears the session.

## Frontend
- Sign-in button redirects to `https://auth.emergentagent.com/?redirect=<origin>/auth-callback`.
- `AuthCallback` reads `session_id` from URL fragment, exchanges via backend, redirects to role-based dashboard.
- Protected routes: `/patient/*`, `/doctor/*` (doctor or admin), `/admin/*` (admin only).

## Roles
- First user → `admin`
- Emails starting with `dr.` → `doctor`
- All others → `patient`
