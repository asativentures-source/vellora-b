# Auth Testing Playbook — Verdia

This app now supports **BOTH** Emergent Google OAuth **AND** JWT email/password.
`GET /api/auth/me` works with either credential.

## Admin owner
- Email: `aasati444@gmail.com`
- Password: `Verdia@Admin2026`
- Seeded automatically on startup.

## Email/Password Flow
1. **Register** → `POST /api/auth/register` `{email,password,name}` sets `access_token` + `refresh_token` httpOnly cookies (secure, samesite=none, path=/).
2. **Login** → `POST /api/auth/login` `{email,password}` — same cookie behavior; 401 on bad credentials; 429 after 5 fails within 15 min.
3. **Refresh** → `POST /api/auth/refresh` reads `refresh_token`, sets a new `access_token`.
4. **Forgot password** → `POST /api/auth/forgot-password` — reset link logged to server logs (`[PASSWORD RESET]`).
5. **Reset password** → `POST /api/auth/reset-password` `{token,password}`.
6. **Logout** → `POST /api/auth/logout` clears all auth cookies.

## Google OAuth Flow (unchanged)
- Frontend: click "Continue with Google" on `/login` → redirects to `https://auth.emergentagent.com/?redirect=<origin>/auth-callback`.
- Backend: `POST /api/auth/session` exchanges `session_id` → issues `session_token` (opaque, in `user_sessions` collection).

## get_current_user
- First tries JWT (`access_token` cookie OR `Authorization: Bearer <jwt>`).
- Falls back to opaque `session_token` (cookie OR `Authorization: Bearer <session_token>`).

## Test Steps
```bash
API=https://metabolic-care-4.preview.emergentagent.com/api

# 1) Register
curl -c c1.txt -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"testpatient@example.com","password":"Passw0rd!","name":"Test Patient"}'

# 2) me
curl -b c1.txt $API/auth/me

# 3) Admin login
curl -c c2.txt -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"aasati444@gmail.com","password":"Verdia@Admin2026"}'

# 4) Admin-only endpoint
curl -b c2.txt $API/admin/stats

# 5) Wrong password → 401
curl -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"aasati444@gmail.com","password":"wrong"}'
```
