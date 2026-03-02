from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api.routes import auth, exercises, users, agent

settings = get_settings()

app = FastAPI(
    title="MathCoach by PilotBoost",
    description="AI-powered mental math training for competitive exam preparation",
    version="2.0.0",  # Agent IA architecture
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(exercises.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")  # ← Agent IA routes


@app.get("/")
async def root():
    return {"name": "MathCoach by PilotBoost", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
