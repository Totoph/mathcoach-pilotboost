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

export interface SubscriptionStatus {
  plan: string;
  active: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  total_exercises: number;
  exercises_limit: number;
}

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
  total_exercises: number;
}

export interface DailyTimeEntry {
  date: string;
  time_ms: number;
  exercises: number;
}

export interface DashboardData {
  global_level: number;
  total_exercises: number;
  total_correct: number;
  accuracy: number;
  avg_time_ms: number;
  total_time_ms: number;
  daily_time_data: DailyTimeEntry[];
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
  correct_answer: string | null;
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

export interface SmartSeriesResult {
  is_exercise_request: boolean;
  exercises: NextExercise[];
  chat_response: string | null;
  description: string | null;
  example_used: string | null;
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
  async getNextExercise(trainingMode?: string, operationFilter?: string[]): Promise<NextExercise> {
    return apiPost<NextExercise>('/agent/next-exercise', {
      training_mode: trainingMode || null,
      operation_filter: operationFilter || null,
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

  // Custom series from example expression
  async generateCustomSeries(example: string, count: number = 10): Promise<{ exercises: NextExercise[] }> {
    return apiPost<{ exercises: NextExercise[] }>('/agent/generate-custom-series', { example, count });
  },

  // Fast skill series: no LLM, just skill + difficulty → exercises instantly
  async generateSkillSeries(skill: string, difficulty: number, count: number = 10): Promise<{ exercises: NextExercise[] }> {
    return apiPost<{ exercises: NextExercise[] }>('/agent/generate-skill-series', { skill, difficulty, count });
  },

  // Smart series: Gemini interprets natural language → exercises or chat
  async smartSeries(message: string, count: number = 10): Promise<SmartSeriesResult> {
    return apiPost<SmartSeriesResult>('/agent/smart-series', { message, count });
  },

  async getConversationHistory(limit: number = 50) {
    return apiGet(`/agent/history?limit=${limit}`);
  },

  // Training mode
  async setTrainingMode(mode: string) {
    return apiPost('/agent/set-mode', { mode });
  },

  // Payments
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    return apiGet<SubscriptionStatus>('/payments/status');
  },

  async createCheckout(plan: string): Promise<{ checkout_url: string }> {
    return apiPost<{ checkout_url: string }>('/payments/create-checkout', { plan });
  },

  async cancelSubscription(): Promise<{ status: string }> {
    return apiPost<{ status: string }>('/payments/cancel');
  },

  async verifyCheckoutSession(sessionId: string): Promise<{ status: string; plan?: string }> {
    return apiGet<{ status: string; plan?: string }>(`/payments/verify-session?session_id=${sessionId}`);
  },
};
