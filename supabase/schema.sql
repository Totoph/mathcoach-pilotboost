-- MathCoach by PilotBoost — Supabase Schema
-- Run this in the Supabase SQL Editor

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    target_exam TEXT DEFAULT NULL, -- 'pilot', 'consulting', 'finance', 'other'
    current_level INT DEFAULT 0,  -- 0 = needs diagnostic
    total_points INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    exercises_completed INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise Sessions
CREATE TABLE IF NOT EXISTS exercise_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    difficulty INT NOT NULL DEFAULT 1,
    exercise_count INT NOT NULL DEFAULT 0,
    exercises JSONB NOT NULL DEFAULT '[]',
    is_diagnostic BOOLEAN DEFAULT FALSE,
    completed BOOLEAN DEFAULT FALSE,
    accuracy FLOAT DEFAULT NULL,
    avg_time FLOAT DEFAULT NULL,
    points_earned INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual Exercise Answers
CREATE TABLE IF NOT EXISTS exercise_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exercise_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    difficulty INT NOT NULL,
    correct_answer FLOAT NOT NULL,
    user_answer FLOAT NOT NULL,
    correct BOOLEAN NOT NULL,
    time_taken FLOAT NOT NULL,
    time_limit FLOAT NOT NULL,
    points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON exercise_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_session ON exercise_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_user ON exercise_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_category ON exercise_answers(user_id, category);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own sessions" ON exercise_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own answers" ON exercise_answers
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for backend)
CREATE POLICY "Service role full access profiles" ON profiles
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access sessions" ON exercise_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access answers" ON exercise_answers
    FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
