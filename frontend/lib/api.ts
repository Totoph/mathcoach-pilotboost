import { supabase } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

async function apiGet<T = any>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1${path}`, { headers });
  if (!res.ok) throw new Error(`API GET ${path} failed (${res.status})`);
  return res.json();
}

async function apiPost<T = any>(path: string, body: any = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `API POST ${path} failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) message = data.detail;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

// ─────────── Types ───────────

export interface SkillScore {
  name: string;
  label: string;
  score: number;
  accuracy: number;
  speed_avg_ms: number;
  attempts: number;
  streak: number;
  difficulty_mastered: number;
  is_automated: boolean;
  is_plateau: boolean;
}

export interface SkillSnapshot {
  date: string;
  global_level: number;
  skill_scores: Record<string, number>;
}

export interface DashboardData {
  global_level: number;
  total_exercises: number;
  total_correct: number;
  accuracy: number;
  skills: SkillScore[];
  strengths: string[];
  weaknesses: string[];
  focus_areas: string[];
  error_breakdown: Record<string, number>;
  history: SkillSnapshot[];
  agent_message: string | null;
  diagnostic_completed: boolean;
}

export interface NextExercise {
  exercise_id: string;
  question: string;
  exercise_type: string;
  sub_skill: string | null;
  difficulty: number;
  tip: string | null;
  time_limit_ms: number | null;
  agent_intro: string | null;
}

export interface SubmitResult {
  is_correct: boolean;
  correct_answer: string;
  agent_feedback: string;
  points_earned: number;
  error_type: string | null;
  technique_tip: string | null;
  state_updated: boolean;
  skill_name: string | null;
  skill_score: number | null;
  global_level: number | null;
}

// ─────────── API ───────────

export const api = {
  // Agent
  async initAgent() {
    return apiPost('/agent/init');
  },

  async getAgentState() {
    return apiGet('/agent/state');
  },

  // Dashboard (single call with all data)
  async getDashboard(): Promise<DashboardData> {
    return apiGet<DashboardData>('/agent/dashboard');
  },

  // Exercises
  async getNextExercise(trainingMode?: string): Promise<NextExercise> {
    return apiPost<NextExercise>('/agent/next-exercise', {
      training_mode: trainingMode || null,
    });
  },

  async submitAnswer(
    exerciseId: string,
    userAnswer: string,
    timeTakenMs: number | null,
  ): Promise<SubmitResult> {
    return apiPost<SubmitResult>('/agent/submit-answer', {
      exercise_id: exerciseId,
      user_answer: userAnswer,
      time_taken_ms: timeTakenMs,
    });
  },

  // Chat
  async chat(message: string) {
    return apiPost<{ agent_message: string; tips: string[] }>('/agent/chat', { message });
  },

  async getConversationHistory(limit: number = 50) {
    return apiGet(`/agent/history?limit=${limit}`);
  },

  // Training mode
  async setTrainingMode(mode: string) {
    return apiPost('/agent/set-mode', { mode });
  },
};
