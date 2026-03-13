from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.api.routes import auth, exercises, users, agent, payments
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="MathCoach by PilotBoost",
    description="AI-powered mental math training for competitive exam preparation",
    version="2.0.0",
)

# Global exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.url}")
    # Note: reading body might hang if not handled carefully, 
    # but kept for your debugging needs
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# --- UPDATED CORS SETTINGS ---
# We list all allowed domains explicitly. 
# Wildcards ("*") fail on Railway when allow_credentials=True.
origins = [
    "http://localhost:3000",
    "https://mathboost.coach",
    "https://www.mathboost.coach",
]

# Allow dynamic frontend URL from Railway environment variables if set
env_frontend = os.getenv("FRONTEND_URL")
if env_frontend and env_frontend not in origins:
    origins.append(env_frontend)

# Allow Vercel preview URLs (pattern: *.vercel.app)
env_vercel_url = os.getenv("VERCEL_URL")
if env_vercel_url:
    vercel_origin = f"https://{env_vercel_url}" if not env_vercel_url.startswith("http") else env_vercel_url
    if vercel_origin not in origins:
        origins.append(vercel_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -----------------------------

# API Routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(exercises.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "name": "MathCoach by PilotBoost", 
        "version": "2.0.0", 
        "status": "running",
        "environment": os.getenv("ENV", "production")
    }

@app.get("/health")
async def health():
    return {"status": "ok"}