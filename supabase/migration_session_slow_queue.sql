-- ============================================================
-- MathCoach — Session Slow Queue Migration
-- Adds: session_slow_queue table for inter-session spaced retry
--
-- Purpose: Track exercises where the student answered correctly
-- but too slowly (above per-operation-type threshold). These are
-- re-served in future sessions using SM-2 spaced repetition.
-- Max 10 slow exercises per session; min 10 new exercises always.
-- source_mode = "tables" (Tables 1-20) or "multiplication" (21-99).
-- ============================================================

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
    -- SM-2 spaced repetition fields
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    review_interval INTEGER DEFAULT 1,
    consecutive_fast_sessions INTEGER DEFAULT 0,
    consecutive_slow_sessions INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question)
);

-- Add new columns to existing table if they don't exist yet
ALTER TABLE session_slow_queue ADD COLUMN IF NOT EXISTS source_mode TEXT NOT NULL DEFAULT 'tables';
ALTER TABLE session_slow_queue ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE session_slow_queue ADD COLUMN IF NOT EXISTS review_interval INTEGER DEFAULT 1;
ALTER TABLE session_slow_queue ADD COLUMN IF NOT EXISTS consecutive_fast_sessions INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_session_slow_queue_user
    ON session_slow_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_session_slow_queue_review
    ON session_slow_queue(user_id, next_review_at ASC);

CREATE INDEX IF NOT EXISTS idx_session_slow_queue_mode
    ON session_slow_queue(user_id, source_mode, next_review_at ASC);
