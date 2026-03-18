from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.api.routes import auth, exercises, users, agent, payments
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _run_migrations():
    """Apply any pending DDL migrations at startup (idempotent)."""
    try:
        from app.core.supabase import get_supabase_admin
        import asyncio
        sb = get_supabase_admin()
        migration_sql = """
        CREATE TABLE IF NOT EXISTS session_slow_queue (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            skill TEXT NOT NULL,
            sub_skill TEXT,
            question TEXT NOT NULL,
            correct_answer TEXT NOT NULL,
            difficulty INTEGER NOT NULL DEFAULT 1,
            time_taken_ms INTEGER,
            threshold_ms INTEGER,
            source_mode TEXT NOT NULL DEFAULT 'tables',
            next_review_at TIMESTAMPTZ DEFAULT NOW(),
            review_interval INTEGER DEFAULT 1,
            consecutive_fast_sessions INTEGER DEFAULT 0,
            consecutive_slow_sessions INTEGER DEFAULT 1,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            last_seen_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, question)
        );
        ALTER TABLE session_slow_queue ADD COLUMN IF NOT EXISTS source_mode TEXT NOT NULL DEFAULT 'tables';
        ALTER TABLE session_slow_queue ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE session_slow_queue ADD COLUMN IF NOT EXISTS review_interval INTEGER DEFAULT 1;
        ALTER TABLE session_slow_queue ADD COLUMN IF NOT EXISTS consecutive_fast_sessions INTEGER DEFAULT 0;
        CREATE INDEX IF NOT EXISTS idx_session_slow_queue_user ON session_slow_queue(user_id);
        CREATE INDEX IF NOT EXISTS idx_session_slow_queue_review ON session_slow_queue(user_id, next_review_at ASC);
        CREATE INDEX IF NOT EXISTS idx_session_slow_queue_mode ON session_slow_queue(user_id, source_mode, next_review_at ASC);
        """
        await asyncio.to_thread(
            lambda: sb.rpc("exec_ddl", {"ddl": migration_sql}).execute()
        )
        logger.info("Migrations applied successfully.")
    except Exception as e:
        # Table may already exist or exec_ddl not available — not fatal.
        logger.warning(f"Migration skipped (table may already exist): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _run_migrations()
    yield


app = FastAPI(
    title="MathCoach by PilotBoost",
    lifespan=lifespan,
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