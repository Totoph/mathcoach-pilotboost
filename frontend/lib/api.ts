import { supabase } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

export const api = {
  // Agent IA
  async initAgent() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/v1/agent/init`, {
      method: 'POST',
      headers,
    });
    
    if (!res.ok) throw new Error('Failed to init agent');
    return res.json();
  },
  
  async getAgentState() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/v1/agent/state`, {
      headers,
    });
    
    if (!res.ok) throw new Error('Failed to get agent state');
    return res.json();
  },
  
  async getNextExercise() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/v1/agent/next-exercise`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    
    if (!res.ok) throw new Error('Failed to get next exercise');
    return res.json();
  },
  
  async submitAnswer(
    exerciseId: string,
    userAnswer: string,
    timeTakenMs: number | null,
  ) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/v1/agent/submit-answer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        exercise_id: exerciseId,
        user_answer: userAnswer,
        time_taken_ms: timeTakenMs,
      }),
    });
    
    if (!res.ok) {
      let message = 'Failed to submit answer';
      try {
        const data = await res.json();
        if (data?.detail) message = data.detail;
      } catch {
        message = `Failed to submit answer (${res.status})`;
      }
      throw new Error(message);
    }
    return res.json();
  },
  
  async chat(message: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/v1/agent/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });
    
    if (!res.ok) throw new Error('Failed to chat with agent');
    return res.json();
  },
  
  async getConversationHistory(limit: number = 50) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/v1/agent/history?limit=${limit}`, {
      headers,
    });
    
    if (!res.ok) throw new Error('Failed to get conversation history');
    return res.json();
  },
};
