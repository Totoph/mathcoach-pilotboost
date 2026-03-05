"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { getUser } from "@/lib/supabase";
import { api } from "@/lib/api";

interface Exercise {
  exercise_id: string;
  question: string;
  exercise_type: string;
  difficulty: number;
  tip: string | null;
  time_limit_ms: number | null;
  agent_intro: string | null;
  correct_answer: string;  // Stocké côté client pour submit
}

interface Message {
  role: "user" | "agent";
  message: string;
  timestamp: number;
}

export default function TrainPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [exerciseStartTime, setExerciseStartTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [shakeInput, setShakeInput] = useState(false);
  const [agentState, setAgentState] = useState<any>(null);
  const [totalExercises, setTotalExercises] = useState(0);
  const [diagnosticCompleted, setDiagnosticCompleted] = useState(false);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Charger l'état de l'agent
      try {
        const state = await api.getAgentState();
        setAgentState(state.instance);
        setTotalExercises(state.instance.state.total_exercises || 0);
        setDiagnosticCompleted(state.instance.diagnostic_completed);
      } catch (err) {
        console.error("Failed to load agent state:", err);
      }

      // Charger l'historique de conversation
      try {
        const history = await api.getConversationHistory(20);
        setMessages(
          history.messages.map((m: any) => ({
            role: m.role,
            message: m.message,
            timestamp: new Date(m.created_at).getTime(),
          }))
        );
      } catch (err) {
        console.error("Failed to load history:", err);
      }

      // Charger le premier exercice
      await loadNextExercise();
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadNextExercise() {
    try {
      const exercise = await api.getNextExercise();
      setCurrentExercise(exercise);
      setExerciseStartTime(Date.now());
      setUserInput("");
      setAnswerState("idle");
      setShakeInput(false);
    } catch (err) {
      console.error("Failed to load exercise:", err);
    }
  }

  async function handleSubmitAnswer() {
    if (!currentExercise || !userInput.trim() || isSubmitting) return;

    const timeTaken = Date.now() - exerciseStartTime;
    setIsSubmitting(true);

    try {
      const result = await api.submitAnswer(
        currentExercise.exercise_id,
        userInput,
        timeTaken,
      );

      if (result.is_correct) {
        setAnswerState("correct");

        // Incrémenter le compteur uniquement sur une bonne réponse
        const newTotal = totalExercises + 1;
        setTotalExercises(newTotal);

        if (!diagnosticCompleted && newTotal >= 10) {
          setDiagnosticCompleted(true);
          try {
            const state = await api.getAgentState();
            setAgentState(state.instance);
          } catch (err) {
            console.error("Failed to reload agent state:", err);
          }
        }

        setTimeout(() => {
          loadNextExercise();
        }, 150);
      } else {
        setAnswerState("wrong");
        setShakeInput(true);

        setTimeout(() => {
          setShakeInput(false);
          setAnswerState("idle");
          setUserInput("");
        }, 220);
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendChat() {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput("");

    // Ajouter message utilisateur
    addMessage("user", userMessage);

    try {
      const response = await api.chat(userMessage);
      addMessage("agent", response.agent_message);
    } catch (err) {
      console.error("Failed to chat:", err);
    }
  }

  function addMessage(role: "user" | "agent", message: string) {
    setMessages((prev) => [
      ...prev,
      { role, message, timestamp: Date.now() },
    ]);
  }

  function handleNumpadClick(value: string) {
    if (value === "←") {
      setUserInput((prev) => prev.slice(0, -1));
    } else if (value === "✓") {
      handleSubmitAnswer();
    } else {
      setUserInput((prev) => prev + value);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
  const minutes = Math.floor(sessionDuration / 60);
  const seconds = sessionDuration % 60;

  return (
    <div className="h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 hover:text-primary transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Quitter</span>
        </button>

        <div className="flex flex-col items-center">
          <div className="text-xl font-bold">MathCoach</div>
          {!diagnosticCompleted ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
              <span>Diagnostic : {totalExercises}/10</span>
              <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(totalExercises / 10) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 mt-1">
              Niveau {agentState?.current_level}/5 · {totalExercises} exercices
            </div>
          )}
        </div>

        <div className="text-sm text-gray-400">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </header>

      {/* Main: Exercise + Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area (Left - 20%) */}
        <div className="w-[20%] bg-slate-800/50 border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-bold flex items-center gap-2">
              💬 Coach IA
            </h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : "bg-white/10 text-gray-100"
                  }`}
                >
                  <div className="text-sm">{msg.message}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder="Envoyer un message..."
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary focus:outline-none text-sm"
              />
              <button
                onClick={handleSendChat}
                className="p-2 bg-primary hover:bg-primary/80 rounded-lg transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Exercise Area (Right - 80%) */}
        <div className="w-[80%] flex flex-col items-center justify-center p-8 relative">
          {currentExercise && (
            <>
              {/* Question */}
              <div className="text-5xl font-bold mb-8 text-center">
                {currentExercise.question}
              </div>

              {/* User Input Display */}
              <div className="mb-8 min-w-[300px]">
                <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center text-3xl font-mono min-h-[60px] flex items-center justify-center">
                  <div
                    className={`${
                      answerState === "correct"
                        ? "text-green-400"
                        : answerState === "wrong"
                        ? "text-red-400"
                        : "text-white"
                    } ${shakeInput ? "animate-shake-x" : ""}`}
                  >
                    {userInput || "_"}
                  </div>
                </div>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {["7", "8", "9", "4", "5", "6", "1", "2", "3", "←", "0", "✓"].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleNumpadClick(key)}
                    className={`w-20 h-20 rounded-xl font-bold text-2xl transition ${
                      key === "✓"
                        ? "bg-gradient-to-r from-green-600 to-green-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        : key === "←"
                        ? "bg-red-600/80 hover:bg-red-600"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                    disabled={key === "✓" && (isSubmitting || !userInput.trim())}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Tip */}
              {currentExercise.tip && (
                <div className="absolute bottom-8 left-8 right-8 bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-center">
                  💡 <span className="font-medium">Tip:</span> {currentExercise.tip}
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
}
