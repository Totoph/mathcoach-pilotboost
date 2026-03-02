-- MathCoach Agent IA Schema
-- Extension du schema existant pour supporter l'architecture conversationnelle

-- Agent Instances (un par utilisateur)
CREATE TABLE IF NOT EXISTS agent_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- État de l'agent
    current_level INT DEFAULT 0,  -- 0 = diagnostic initial
    diagnostic_completed BOOLEAN DEFAULT FALSE,
    
    -- State machine JSON
    state JSONB NOT NULL DEFAULT '{
        "strengths": [],
        "weaknesses": [],
        "focus_areas": [],
        "last_difficulty": 1,
        "session_count": 0,
        "total_exercises": 0
    }'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations avec l'agent
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_instance_id UUID NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- tips, context, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performances détaillées par exercice
CREATE TABLE IF NOT EXISTS exercise_performances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_instance_id UUID NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE,
    
    -- Question
    exercise_type TEXT NOT NULL, -- 'addition', 'multiplication', 'division', etc.
    question TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    
    -- Réponse utilisateur
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    time_taken_ms INTEGER, -- NULL si pas de limite de temps
    
    -- Contexte
    difficulty INT NOT NULL DEFAULT 1,
    tip_shown TEXT, -- Tip montré pendant l'exercice
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_agent_instances_user ON agent_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON agent_conversations(agent_instance_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON agent_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_performances_agent ON exercise_performances(agent_instance_id);
CREATE INDEX IF NOT EXISTS idx_performances_type ON exercise_performances(exercise_type);
CREATE INDEX IF NOT EXISTS idx_performances_created ON exercise_performances(created_at);

-- RLS Policies
ALTER TABLE agent_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_performances ENABLE ROW LEVEL SECURITY;

-- Users can only read their own agent data
CREATE POLICY "Users read own agent instance" ON agent_instances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own conversations" ON agent_conversations
    FOR SELECT USING (
        agent_instance_id IN (
            SELECT id FROM agent_instances WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users read own performances" ON exercise_performances
    FOR SELECT USING (
        agent_instance_id IN (
            SELECT id FROM agent_instances WHERE user_id = auth.uid()
        )
    );

-- Service role (backend) has full access
CREATE POLICY "Service role full access agent_instances" ON agent_instances
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access conversations" ON agent_conversations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access performances" ON exercise_performances
    FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE TRIGGER agent_instances_updated_at
    BEFORE UPDATE ON agent_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: create agent instance on user signup
CREATE OR REPLACE FUNCTION create_agent_instance_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO agent_instances (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_agent_instance_for_user();
