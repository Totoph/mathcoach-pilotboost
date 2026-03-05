"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Send, Clock, Sparkles, Minus, Info, Eye, EyeOff, ChevronRight } from "lucide-react";
import { getUser } from "@/lib/supabase";
import { api, NextExercise, SubmitResult } from "@/lib/api";

// ─── Types ───

interface Message {
  role: "user" | "agent";
  message: string;
  timestamp: number;
}

interface SeriesResult {
  question: string;
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
  time_ms: number;
  error_type: string | null;
  technique_tip: string | null;
  skill_name: string | null;
}

const SERIES_SIZE = 10;

// ─── Page ───

export default function TrainPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core state
  const [loading, setLoading] = useState(true);
  const [currentExercise, setCurrentExercise] = useState<NextExercise | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isNegative, setIsNegative] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [shakeInput, setShakeInput] = useState(false);

  // Session
  const [sessionStartTime] = useState(Date.now());
  const [exerciseStartTime, setExerciseStartTime] = useState(Date.now());
  const [totalExercises, setTotalExercises] = useState(0);
  const [globalLevel, setGlobalLevel] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Training mode (from query or dashboard)
  const [trainingMode, setTrainingMode] = useState<string | null>(null);

  // Series of 10
  const [seriesResults, setSeriesResults] = useState<SeriesResult[]>([]);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [showPause, setShowPause] = useState(false);
  const [seriesStartTime, setSeriesStartTime] = useState(Date.now());

  // Settings
  const [showHints, setShowHints] = useState(true);

  // Wrong answer: show correct + "next" button
  const [wrongResult, setWrongResult] = useState<SubmitResult | null>(null);

  // Chat (only user-initiated)
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Input ref for keyboard focus
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Init ───

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode) setTrainingMode(mode);
  }, [searchParams]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) { router.push("/auth/login"); return; }
      try {
        const state = await api.getAgentState();
        setTotalExercises(state.instance.state.total_exercises || 0);
        setGlobalLevel(state.instance.state.global_level || 0);
      } catch {}
      await loadNextExercise();
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep focus on hidden input for keyboard
  useEffect(() => {
    if (!showPause && !loading) {
      inputRef.current?.focus();
    }
  }, [currentExercise, showPause, loading, wrongResult]);

  // ─── Exercise loading ───

  const loadNextExercise = useCallback(async () => {
    try {
      const exercise = await api.getNextExercise(trainingMode || undefined);
      setCurrentExercise(exercise);
      setExerciseStartTime(Date.now());
      setUserInput("");
      setIsNegative(false);
      setAnswerState("idle");
      setShakeInput(false);
      setWrongResult(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error("Failed to load exercise:", err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingMode]);

  // ─── Submit answer ───

  async function handleSubmitAnswer() {
    if (!currentExercise || !userInput.trim() || isSubmitting || wrongResult) return;

    const finalAnswer = isNegative ? `-${userInput}` : userInput;
    const timeTaken = Date.now() - exerciseStartTime;
    setIsSubmitting(true);

    try {
      const result = await api.submitAnswer(currentExercise.exercise_id, finalAnswer, timeTaken);
      setGlobalLevel(result.global_level || globalLevel);

      const sr: SeriesResult = {
        question: currentExercise.question,
        correct_answer: result.correct_answer,
        user_answer: finalAnswer,
        is_correct: result.is_correct,
        time_ms: timeTaken,
        error_type: result.error_type,
        technique_tip: result.technique_tip,
        skill_name: result.skill_name,
      };

      const newResults = [...seriesResults, sr];
      setSeriesResults(newResults);

      if (result.is_correct) {
        setAnswerState("correct");
        setTotalExercises((prev) => prev + 1);
        const newIdx = seriesIndex + 1;
        setSeriesIndex(newIdx);

        // Check if series of 10 done
        if (newIdx >= SERIES_SIZE) {
          setTimeout(() => setShowPause(true), 300);
        } else {
          setTimeout(() => loadNextExercise(), 200);
        }
      } else {
        setAnswerState("wrong");
        setShakeInput(true);
        setWrongResult(result);
        setSeriesIndex(seriesIndex + 1);
        setTimeout(() => { setShakeInput(false); }, 300);
      }
    } catch (err) {
      console.error("Failed to submit:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  // After wrong answer: next exercise
  function handleContinueAfterWrong() {
    setWrongResult(null);
    setAnswerState("idle");
    setUserInput("");
    setIsNegative(false);

    if (seriesIndex >= SERIES_SIZE) {
      setShowPause(true);
    } else {
      loadNextExercise();
    }
  }

  // After pause: start new series
  function handleStartNewSeries() {
    setShowPause(false);
    setSeriesResults([]);
    setSeriesIndex(0);
    setSeriesStartTime(Date.now());
    loadNextExercise();
  }

  // ─── Keyboard input handler ───

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showPause) {
      if (e.key === "Enter" || e.key === " ") handleStartNewSeries();
      return;
    }

    if (wrongResult) {
      if (e.key === "Enter" || e.key === " ") handleContinueAfterWrong();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitAnswer();
    } else if (e.key === "Backspace") {
      setUserInput((prev) => prev.slice(0, -1));
    } else if (e.key === "-") {
      setIsNegative((prev) => !prev);
    } else if (e.key === "." || e.key === ",") {
      if (!userInput.includes(".")) setUserInput((prev) => prev + ".");
    } else if (/^[0-9]$/.test(e.key)) {
      setUserInput((prev) => prev + e.key);
    }
  }

  // ─── Numpad click ───

  function handleNumpadClick(value: string) {
    if (wrongResult) return;
    if (value === "DEL") {
      setUserInput((prev) => prev.slice(0, -1));
    } else if (value === "OK") {
      handleSubmitAnswer();
    } else if (value === "±") {
      setIsNegative((prev) => !prev);
    } else if (value === ".") {
      if (!userInput.includes(".")) setUserInput((prev) => prev + ".");
    } else {
      setUserInput((prev) => prev + value);
    }
    inputRef.current?.focus();
  }

  // ─── Chat ───

  async function handleSendChat() {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", message: msg, timestamp: Date.now() }]);
    try {
      const res = await api.chat(msg);
      setMessages((prev) => [...prev, { role: "agent", message: res.agent_message, timestamp: Date.now() }]);
    } catch {}
  }

  // ─── Mode change ───

  function handleModeChange(mode: string) {
    setTrainingMode(mode);
    api.setTrainingMode(mode).catch(() => {});
    setSeriesResults([]);
    setSeriesIndex(0);
    setShowPause(false);
    loadNextExercise();
  }

  // ─── Loading ───

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="bento-card px-8 py-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 font-medium">Chargement...</span>
        </div>
      </div>
    );
  }

  const sessionSec = Math.floor((now - sessionStartTime) / 1000);
  const mm = Math.floor(sessionSec / 60);
  const ss = sessionSec % 60;
  const displayAnswer = (isNegative ? "-" : "") + (userInput || "");

  // ─── PAUSE / SERIES STATS SCREEN ───

  if (showPause) {
    const correct = seriesResults.filter((r) => r.is_correct).length;
    const wrong = seriesResults.filter((r) => !r.is_correct).length;
    const totalTime = seriesResults.reduce((s, r) => s + r.time_ms, 0);
    const avgTime = Math.round(totalTime / seriesResults.length);
    const accuracy = Math.round((correct / seriesResults.length) * 100);
    const wrongResults = seriesResults.filter((r) => !r.is_correct);
    // Collect unique technique tips from mistakes
    const tips = wrongResults
      .map((r) => r.technique_tip)
      .filter((t): t is string => !!t)
      .filter((t, i, a) => a.indexOf(t) === i);

    return (
      <div className="h-[calc(100vh-6.5rem)] flex items-center justify-center overflow-y-auto" onKeyDown={(e) => { if (e.key === "Enter") handleStartNewSeries(); }} tabIndex={0}>
        <div className="max-w-lg w-full p-4 space-y-4">
          {/* Stats card */}
          <div className="bento-card p-6">
            <div className="text-center mb-4">
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Série terminée ! 🎯</h2>
              <p className="text-slate-400 text-xs">{SERIES_SIZE} exercices complétés</p>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2.5 bg-green-50 rounded-xl">
                <div className="text-2xl font-extrabold text-green-600">{correct}</div>
                <div className="text-[10px] text-green-700 font-medium">Correctes</div>
              </div>
              <div className="text-center p-2.5 bg-red-50 rounded-xl">
                <div className="text-2xl font-extrabold text-red-500">{wrong}</div>
                <div className="text-[10px] text-red-600 font-medium">Erreurs</div>
              </div>
              <div className="text-center p-2.5 bg-blue-50 rounded-xl">
                <div className="text-2xl font-extrabold text-blue-600">{accuracy}%</div>
                <div className="text-[10px] text-blue-700 font-medium">Précision</div>
              </div>
              <div className="text-center p-2.5 bg-purple-50 rounded-xl">
                <div className="text-2xl font-extrabold text-purple-600">{(avgTime / 1000).toFixed(1)}s</div>
                <div className="text-[10px] text-purple-700 font-medium">Temps moy.</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
              <span>Niveau global</span>
              <span className="font-bold text-slate-900">{Math.round(globalLevel)}/100</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
              <span>Total exercices</span>
              <span className="font-bold text-slate-900">{totalExercises}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
              <span>Durée mentale</span>
              <span className="font-bold text-slate-900">{Math.round(totalTime / 60000)} min</span>
            </div>
          </div>

          {wrongResults.length > 0 && (
            <div className="bento-card p-4">
              <h3 className="font-bold text-slate-900 text-xs mb-2">❌ À revoir</h3>
              <div className="space-y-1.5">
                {wrongResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-red-50/60 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-mono text-slate-700">{r.question}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-red-500 line-through">{r.user_answer}</span>
                      <span className="text-xs font-bold text-green-600">{r.correct_answer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tips.length > 0 && (
            <div className="bento-card p-4">
              <h3 className="font-bold text-slate-900 text-xs mb-2">💡 Techniques à retenir</h3>
              <div className="space-y-1.5">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 bg-blue-50/60 rounded-lg px-3 py-2">
                    <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-slate-700">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleStartNewSeries}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            Série suivante <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => router.push("/dashboard")}
            className="w-full py-2 text-slate-500 hover:text-slate-700 font-medium text-xs transition-all">
            Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── MAIN TRAINING VIEW ───

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden">
      {/* Hidden input for keyboard capture */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 w-0 h-0"
        onKeyDown={handleKeyDown}
        autoFocus
        tabIndex={0}
      />

      {/* Top bar */}
      <div className="flex-shrink-0 grid grid-cols-5 gap-2.5 p-2.5">
        <div className="bento-card p-2.5 flex items-center gap-2">
          <button onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-slate-900 hidden sm:inline">MathCoach</span>
        </div>

        {/* Mode selector */}
        <div className="bento-card p-2.5 flex items-center justify-center gap-1.5">
          {[
            { key: "free", label: "Libre" },
            { key: "tables", label: "Tables" },
          ].map((m) => (
            <button key={m.key} onClick={() => handleModeChange(m.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                (trainingMode || "free") === m.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              }`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Series progress */}
        <div className="bento-card p-2.5 flex items-center justify-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: SERIES_SIZE }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                i < seriesIndex
                  ? seriesResults[i]?.is_correct ? "bg-green-500" : "bg-red-400"
                  : i === seriesIndex ? "bg-slate-900 scale-125" : "bg-slate-200"
              }`} />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-600">{seriesIndex}/{SERIES_SIZE}</span>
        </div>

        {/* Level */}
        <div className="bento-card p-2.5 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-900">{Math.round(globalLevel)}/100</span>
        </div>

        {/* Timer + Hints toggle */}
        <div className="bento-card p-2.5 flex items-center justify-end gap-2.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-mono font-bold text-slate-600">
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </span>
          </div>
          <button onClick={() => setShowHints(!showHints)} title={showHints ? "Masquer les aides" : "Afficher les aides"}
            className={`p-1.5 rounded-lg transition-all ${showHints ? "bg-blue-50 text-blue-500" : "bg-slate-50 text-slate-400"}`}>
            {showHints ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main: Chat + Exercise — fills remaining space, no scroll */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2.5 px-2.5 pb-2.5 min-h-0">
        {/* Chat — only section that scrolls */}
        <div className="lg:col-span-1 bento-card flex flex-col min-h-0 overflow-hidden">
          <div className="flex-shrink-0 p-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h2 className="font-bold text-sm text-slate-900">Coach IA</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400 text-center mt-4">
                Pose une question sur une technique de calcul mental...
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-700 border border-slate-100"
                }`}>
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="flex-shrink-0 p-2.5 border-t border-slate-100">
            <div className="flex gap-2">
              <input type="text" value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleSendChat(); } }}
                placeholder="Pose ta question..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-primary focus:outline-none text-sm" />
              <button onClick={handleSendChat}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Exercise area — no scroll, centered */}
        <div className="lg:col-span-3 bento-card flex flex-col items-center justify-center relative min-h-0 overflow-hidden"
          onClick={() => inputRef.current?.focus()}>

          {currentExercise && (
            <>
              {/* Badge */}
              <div className="absolute top-3 left-4 flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                  {currentExercise.exercise_type} · diff {currentExercise.difficulty}
                </span>
                {currentExercise.sub_skill && (
                  <span className="text-[11px] font-medium text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                    {currentExercise.sub_skill}
                  </span>
                )}
              </div>

              {/* Question */}
              <div className="text-5xl lg:text-7xl font-extrabold text-slate-900 mb-5 text-center tracking-tight select-none">
                {currentExercise.question}
              </div>

              {/* Wrong answer feedback */}
              {wrongResult && (
                <div className="mb-3 max-w-sm w-full px-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-2">
                    <p className="text-lg font-bold text-green-600">
                      {wrongResult.correct_answer}
                    </p>
                    {showHints && wrongResult.technique_tip && (
                      <div className="flex items-start gap-1.5 bg-white/60 rounded-lg p-2">
                        <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-slate-700 text-left">{wrongResult.technique_tip}</p>
                      </div>
                    )}
                    {showHints && wrongResult.error_type && (
                      <span className="inline-block text-[9px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                        {wrongResult.error_type}
                      </span>
                    )}
                    <button onClick={handleContinueAfterWrong}
                      className="mt-1.5 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-all">
                      Continuer ▸
                    </button>
                  </div>
                </div>
              )}

              {/* Answer input (only if not showing wrong result) */}
              {!wrongResult && (
                <>
                  <div className="mb-4 min-w-[260px]">
                    <div className={`rounded-2xl border-2 px-8 py-3 text-center text-4xl font-mono min-h-[56px] flex items-center justify-center transition-all duration-150 bg-white ${
                      answerState === "correct" ? "border-green-400 bg-green-50/50"
                        : answerState === "wrong" ? "border-red-400 bg-red-50/50"
                        : "border-slate-200"
                    } ${shakeInput ? "animate-shake-x" : ""}`}>
                      <span className={`${
                        answerState === "correct" ? "text-green-500"
                          : answerState === "wrong" ? "text-red-500"
                          : "text-slate-900"
                      }`}>
                        {displayAnswer || <span className="text-slate-300">?</span>}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center mt-1.5">Clavier ou pavé numérique</p>
                  </div>

                  {/* Numpad (compact) */}
                  <div className="grid grid-cols-4 gap-2">
                    {["7", "8", "9", "DEL", "4", "5", "6", "±", "1", "2", "3", ".", "0", "00", "OK", ""].map((key, idx) => {
                      if (key === "") return <div key={idx} />;
                      return (
                        <button key={key} onClick={() => handleNumpadClick(key)}
                          className={`w-[56px] h-[48px] rounded-xl font-bold text-base transition-all duration-100 select-none ${
                            key === "OK"
                              ? "bg-green-500 text-white hover:bg-green-600 disabled:opacity-40"
                              : key === "DEL"
                              ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                              : key === "±"
                              ? `${isNegative ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600"} hover:bg-blue-400 hover:text-white`
                              : "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50"
                          }`}
                          disabled={key === "OK" && (isSubmitting || !userInput.trim())}>
                          {key === "±" ? <Minus className="w-4 h-4 mx-auto" /> : key}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Tip (only if hints enabled) */}
              {showHints && currentExercise.tip && !wrongResult && (
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center text-xs text-slate-500">
                    💡 {currentExercise.tip}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
