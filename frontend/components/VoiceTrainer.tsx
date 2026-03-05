"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, Globe, ChevronRight } from "lucide-react";
import { useVoice, VoiceLang, mathToSpeech } from "@/hooks/useVoice";
import { api, NextExercise, SubmitResult } from "@/lib/api";

// ─── Types ───

interface VoiceTrainerProps {
  /** Current exercise from the parent */
  currentExercise: NextExercise | null;
  /** Called when voice submits an answer (to sync with parent state) */
  onAnswer: (answer: string) => void;
  /** Called when voice mode requests next exercise */
  onNextExercise: () => void;
  /** Whether the parent is currently loading */
  loading?: boolean;
  /** Current series index */
  seriesIndex: number;
  /** Series size */
  seriesSize: number;
  /** Whether we are on the pause screen */
  showPause: boolean;
}

type VoiceState = "idle" | "speaking" | "listening" | "processing" | "feedback";

const LABELS: Record<VoiceLang, Record<string, string>> = {
  fr: {
    title: "Entraînement vocal",
    start: "Démarrer",
    stop: "Arrêter",
    listening: "J'écoute...",
    speaking: "Je parle...",
    processing: "Vérification...",
    correct: "Correct !",
    wrong: "Incorrect",
    tryAgain: "Réessaie",
    nextQ: "Question suivante...",
    noSupport: "Votre navigateur ne supporte pas la reconnaissance vocale.",
    langLabel: "Langue",
    seriesDone: "Série terminée !",
    autoMode: "Mode auto",
    manualMode: "Manuel",
    micPermission: "Autorisez le micro pour continuer",
    speed: "Vitesse",
    readyPrompt: "Appuie sur Démarrer pour commencer l'entraînement vocal",
  },
  en: {
    title: "Voice Training",
    start: "Start",
    stop: "Stop",
    listening: "Listening...",
    speaking: "Speaking...",
    processing: "Checking...",
    correct: "Correct!",
    wrong: "Incorrect",
    tryAgain: "Try again",
    nextQ: "Next question...",
    noSupport: "Your browser does not support speech recognition.",
    langLabel: "Language",
    seriesDone: "Series complete!",
    autoMode: "Auto mode",
    manualMode: "Manual",
    micPermission: "Allow microphone access to continue",
    speed: "Speed",
    readyPrompt: "Press Start for voice training",
  },
};

// Feedback phrases
const CORRECT_PHRASES: Record<VoiceLang, string[]> = {
  fr: ["Correct !", "Bravo !", "Exact !", "Bien joué !", "C'est ça !"],
  en: ["Correct!", "Well done!", "Exactly!", "Nice!", "That's right!"],
};
const WRONG_PHRASES: Record<VoiceLang, string[]> = {
  fr: ["Non, la réponse est", "Pas tout à fait, c'est", "Incorrect, la bonne réponse est"],
  en: ["No, the answer is", "Not quite, it's", "Incorrect, the correct answer is"],
};

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function VoiceTrainer({
  currentExercise,
  onAnswer,
  onNextExercise,
  loading,
  seriesIndex,
  seriesSize,
  showPause,
}: VoiceTrainerProps) {
  const [lang, setLang] = useState<VoiceLang>("fr");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isActive, setIsActive] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [speechRate, setSpeechRate] = useState(1.0);

  const exerciseStartRef = useRef(Date.now());
  const isActiveRef = useRef(false);
  const exerciseRef = useRef(currentExercise);
  const voiceStateRef = useRef(voiceState);

  // Keep refs in sync
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { exerciseRef.current = currentExercise; }, [currentExercise]);
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);

  // Voice hook
  const {
    speak,
    speakMath,
    startListening,
    stopListening,
    isSpeaking,
    isListening,
    transcript,
    lastAnswer,
    isSupported,
    error: voiceError,
  } = useVoice({
    lang,
    onResult: handleVoiceResult,
  });

  const labels = LABELS[lang];

  // ─── Voice result handler ───

  function handleVoiceResult(answer: string) {
    if (!isActiveRef.current || !exerciseRef.current) return;

    setVoiceState("processing");

    const exercise = exerciseRef.current;
    const timeTaken = Date.now() - exerciseStartRef.current;

    // Local fast check
    if (exercise.correct_answer && answer === exercise.correct_answer) {
      // Correct!
      handleCorrectAnswer(answer, exercise, timeTaken);
    } else if (exercise.correct_answer && answer !== exercise.correct_answer) {
      // Wrong — allow retry or move on
      handleWrongAnswer(answer, exercise, timeTaken);
    } else {
      // No local answer available, check with backend
      checkWithBackend(answer, exercise, timeTaken);
    }
  }

  async function handleCorrectAnswer(answer: string, exercise: NextExercise, timeTaken: number) {
    const phrase = randomPick(CORRECT_PHRASES[lang]);
    setLastFeedback(phrase);
    setLastCorrectAnswer(null);
    setVoiceState("feedback");
    setAttempts(0);

    // Tell parent
    onAnswer(answer);

    // Fire-and-forget backend
    api.submitAnswer(exercise.exercise_id, answer, timeTaken).catch(() => {});

    // Speak feedback
    await speak(phrase);

    // Auto-advance
    if (isActiveRef.current && autoMode) {
      await advanceToNext();
    } else {
      setVoiceState("idle");
    }
  }

  async function handleWrongAnswer(answer: string, exercise: NextExercise, timeTaken: number) {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= 2) {
      // Give answer after 2 wrong attempts
      const phrase = `${randomPick(WRONG_PHRASES[lang])} ${exercise.correct_answer}`;
      setLastFeedback(phrase);
      setLastCorrectAnswer(exercise.correct_answer!);
      setVoiceState("feedback");
      setAttempts(0);

      // Tell parent (wrong answer)
      onAnswer(answer);

      // Fire-and-forget backend
      api.submitAnswer(exercise.exercise_id, answer, timeTaken).catch(() => {});

      await speak(phrase);

      if (isActiveRef.current && autoMode) {
        await advanceToNext();
      } else {
        setVoiceState("idle");
      }
    } else {
      // First wrong attempt — let them retry
      const retryPhrase = lang === "fr" ? "Réessaie" : "Try again";
      setLastFeedback(retryPhrase);
      setVoiceState("feedback");

      await speak(retryPhrase);

      // Listen again
      if (isActiveRef.current) {
        setVoiceState("listening");
        setTimeout(() => startListening(), 300);
      }
    }
  }

  async function checkWithBackend(answer: string, exercise: NextExercise, timeTaken: number) {
    try {
      const result = await api.submitAnswer(exercise.exercise_id, answer, timeTaken);
      if (result.is_correct) {
        await handleCorrectAnswer(answer, exercise, timeTaken);
      } else {
        setAttempts((prev) => prev + 1);
        await handleWrongAnswer(answer, exercise, timeTaken);
      }
    } catch {
      // On error, just move on
      if (isActiveRef.current && autoMode) {
        await advanceToNext();
      }
    }
  }

  async function advanceToNext() {
    if (!isActiveRef.current) return;

    setVoiceState("idle");
    setLastFeedback(null);
    setLastCorrectAnswer(null);

    // Small pause
    await new Promise((r) => setTimeout(r, 600));

    if (!isActiveRef.current) return;

    onNextExercise();
  }

  // ─── Speak the exercise when it changes ───

  useEffect(() => {
    if (!isActive || !currentExercise || showPause) return;

    exerciseStartRef.current = Date.now();
    setAttempts(0);
    setLastFeedback(null);
    setLastCorrectAnswer(null);

    async function speakAndListen() {
      setVoiceState("speaking");

      // Build spoken text
      const spokenText = mathToSpeech(currentExercise!.question, lang);
      await speak(spokenText);

      if (!isActiveRef.current) return;

      // Start listening
      setVoiceState("listening");
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 200);
    }

    // Small delay so the UI can update
    const timer = setTimeout(speakAndListen, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExercise, isActive, showPause]);

  // ─── Start / Stop control ───

  function handleStart() {
    setIsActive(true);
    setVoiceState("idle");
    setLastFeedback(null);

    // If there's already an exercise, the useEffect above will trigger
    if (!currentExercise) {
      onNextExercise();
    }
  }

  function handleStop() {
    setIsActive(false);
    setVoiceState("idle");
    stopListening();
    window.speechSynthesis?.cancel();
  }

  // ─── Manual listen trigger ───

  function handleManualListen() {
    if (voiceState === "listening") {
      stopListening();
      setVoiceState("idle");
    } else {
      setVoiceState("listening");
      startListening();
    }
  }

  // ─── Language toggle ───

  function toggleLang() {
    const newLang = lang === "fr" ? "en" : "fr";
    setLang(newLang);
    stopListening();
    window.speechSynthesis?.cancel();
  }

  // ─── Render ───

  if (!isSupported) {
    return (
      <div className="bento-card p-4">
        <p className="text-sm text-red-500">{labels.noSupport}</p>
      </div>
    );
  }

  // Status indicator color and pulse
  const stateColors: Record<VoiceState, string> = {
    idle: "bg-slate-300",
    speaking: "bg-blue-500",
    listening: "bg-red-500",
    processing: "bg-yellow-500",
    feedback: "bg-green-500",
  };

  const stateLabels: Record<VoiceState, string> = {
    idle: isActive ? (lang === "fr" ? "Prêt" : "Ready") : labels.readyPrompt,
    speaking: labels.speaking,
    listening: labels.listening,
    processing: labels.processing,
    feedback: lastFeedback || "",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-3 py-4 h-full">
      {/* Title */}
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${stateColors[voiceState]} ${
          voiceState === "listening" ? "animate-pulse" : ""
        }`} />
        <h3 className="font-bold text-sm text-slate-900">{labels.title}</h3>
      </div>

      {/* Speed + Language row */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">{labels.speed}</span>
          <select
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-slate-600"
          >
            <option value={0.7}>0.7x</option>
            <option value={0.85}>0.85x</option>
            <option value={1.0}>1x</option>
            <option value={1.2}>1.2x</option>
            <option value={1.5}>1.5x</option>
          </select>
        </div>
        <button
          onClick={toggleLang}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-all border border-slate-200"
        >
          <Globe className="w-3 h-3" />
          {lang === "fr" ? "FR" : "EN"}
        </button>
      </div>

      {/* Status / feedback */}
      <div className="text-center px-2">
        <p className={`text-sm font-medium ${
          voiceState === "feedback" && lastCorrectAnswer
            ? "text-red-500"
            : voiceState === "feedback"
            ? "text-green-600"
            : "text-slate-500"
        }`}>
          {stateLabels[voiceState]}
        </p>
        {transcript && voiceState === "listening" && (
          <p className="text-xs text-slate-400 mt-1 italic">« {transcript} »</p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-col items-center gap-2 w-full">
        {!isActive ? (
          <button
            onClick={handleStart}
            disabled={loading || showPause}
            className="flex items-center justify-center gap-2 w-full max-w-[200px] py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all"
          >
            <Play className="w-4 h-4" />
            {labels.start}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm transition-all"
            >
              <Pause className="w-4 h-4" />
              {labels.stop}
            </button>

            {!autoMode && (
              <button
                onClick={handleManualListen}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  isListening
                    ? "bg-red-100 text-red-600 border border-red-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? labels.stop : labels.listening.replace("...", "")}
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setAutoMode(!autoMode)}
          className={`text-[11px] px-3 py-1 rounded-full transition-all ${
            autoMode
              ? "bg-blue-100 text-blue-700 border border-blue-200"
              : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}
        >
          {autoMode ? labels.autoMode : labels.manualMode}
        </button>
      </div>

      {/* Error display */}
      {voiceError && (
        <p className="text-xs text-red-500 text-center">{voiceError}</p>
      )}
    </div>
  );
}
