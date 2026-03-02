import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    const res = await fetch(`${API_URL}/api/v1/agent/init`, {
      method: 'POST',
      headers,
    });
    
    if (!res.ok) throw new Error('Failed to init agent');
    return res.json();
  },
  
  async getAgentState() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/v1/agent/state`, {
      headers,
    });
    
    if (!res.ok) throw new Error('Failed to get agent state');
    return res.json();
  },
  
  async getNextExercise() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/v1/agent/next-exercise`, {
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
    exerciseData: any
  ) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/v1/agent/submit-answer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        exercise_id: exerciseId,
        user_answer: userAnswer,
        time_taken_ms: timeTakenMs,
        // Flatten exerciseData for backend validation
        question: exerciseData.question,
        correct_answer: exerciseData.correct_answer,
        exercise_type: exerciseData.exercise_type,
        difficulty: exerciseData.difficulty,
        tip: exerciseData.tip || null,
      }),
    });
    
    if (!res.ok) throw new Error('Failed to submit answer');
    return res.json();
  },
  
  async chat(message: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/v1/agent/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });
    
    if (!res.ok) throw new Error('Failed to chat with agent');
    return res.json();
  },
  
  async getConversationHistory(limit: number = 50) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/v1/agent/history?limit=${limit}`, {
      headers,
    });
    
    if (!res.ok) throw new Error('Failed to get conversation history');
    return res.json();
  },
};
