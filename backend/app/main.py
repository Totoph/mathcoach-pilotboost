from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.api.routes import auth, exercises, users, agent, payments
import logging
import os

logger = logging.getLogger(__name__)

app = FastAPI(
    title="MathCoach by PilotBoost",
    description="AI-powered mental math training for competitive exam preparation",
    version="2.0.0",  # Agent IA architecture
)

# Global exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.url}")
    logger.error(f"Request body: {await request.body()}")
    logger.error(f"Validation errors: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# CORS - permissif en développement
env = os.getenv("ENV", "development")
frontend_url = os.getenv("FRONTEND_URL", "https://mathcoach.pilotboost.fr")
origins = ["*"] if env == "development" else [frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(exercises.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")  # ← Agent IA routes
app.include_router(payments.router, prefix="/api/v1")  # ← Stripe payments


@app.get("/")
async def root():
    return {"name": "MathCoach by PilotBoost", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
