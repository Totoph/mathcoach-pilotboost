-- ============================================================
-- MathCoach V2 — Skill Engine Migration
-- Adds: skill snapshots, spaced repetition, error tracking
-- ============================================================

-- 1. Add error_type column to exercise_performances
ALTER TABLE exercise_performances
  ADD COLUMN IF NOT EXISTS error_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sub_skill TEXT DEFAULT NULL;

-- 2. Skill snapshots — daily history for graphing progress
CREATE TABLE IF NOT EXISTS skill_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    global_level INTEGER NOT NULL DEFAULT 0,
    skill_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_exercises INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

-- 3. Spaced repetition queue — per-user review items
CREATE TABLE IF NOT EXISTS spaced_repetition_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    sub_skill TEXT,
    question TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,
    -- SM-2 fields
    repetitions INTEGER NOT NULL DEFAULT 0,
    ease_factor FLOAT NOT NULL DEFAULT 2.5,
    interval_days FLOAT NOT NULL DEFAULT 0.5,
    next_review TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed TIMESTAMPTZ,
    -- Stats
    total_attempts INTEGER NOT NULL DEFAULT 0,
    total_correct INTEGER NOT NULL DEFAULT 0,
    avg_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Error patterns — structured error tracking
CREATE TABLE IF NOT EXISTS error_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    error_type TEXT NOT NULL,
    question TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    time_taken_ms INTEGER,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_skill_snapshots_user ON skill_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_snapshots_date ON skill_snapshots(user_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_sr_queue_user ON spaced_repetition_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sr_queue_review ON spaced_repetition_queue(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_sr_queue_skill ON spaced_repetition_queue(user_id, skill);
CREATE INDEX IF NOT EXISTS idx_error_patterns_user ON error_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_error_patterns_skill ON error_patterns(user_id, skill);
CREATE INDEX IF NOT EXISTS idx_performances_sub_skill ON exercise_performances(exercise_type, sub_skill);

-- 6. RLS Policies
ALTER TABLE skill_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaced_repetition_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own snapshots" ON skill_snapshots
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access snapshots" ON skill_snapshots
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users read own sr_queue" ON spaced_repetition_queue
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access sr_queue" ON spaced_repetition_queue
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users read own error_patterns" ON error_patterns
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access error_patterns" ON error_patterns
    FOR ALL USING (auth.role() = 'service_role');

-- 7. Updated_at trigger for sr_queue
CREATE TRIGGER sr_queue_updated_at
    BEFORE UPDATE ON spaced_repetition_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
