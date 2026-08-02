Backend startup steps:

1. Open PowerShell in the backend folder.
2. Activate the virtual environment:
   .\.venv\Scripts\Activate.ps1
3. If needed, allow script execution for this session:
   Set-ExecutionPolicy -Scope Process RemoteSigned
4. Install backend packages:
   python -m pip install -r requirements.txt
5. Make sure .env exists with MONGO_URL, DB_NAME, and JWT_SECRET.
6. Start the server:
   python -m uvicorn server:app --app-dir . --reload --host 0.0.0.0 --port 8000

What I did:

- Created the backend .env file because the server was missing runtime settings.
- Added the required values: MONGO_URL, DB_NAME, JWT_SECRET, CORS_ORIGINS, ADMIN_EMAIL, ADMIN_PASSWORD, and EMERGENT_LLM_KEY.
- Installed the backend dependencies with the venv Python using pip.
