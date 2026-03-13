"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send,
  Clock,
  Sparkles,
  Minus,
  Info,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Check,
  TrendingUp,
  TrendingDown,
  Equal,
  Mic,
  MicOff,
  X,
} from "lucide-react";
import { getUser } from "@/lib/supabase";
import { api, NextExercise } from "@/lib/api";
import VoiceTrainer from "@/components/VoiceTrainer";
import PaywallPopup from "@/components/PaywallPopup";
import { useTranslation } from "@/lib/i18n";

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

const OPERATION_OPTIONS = [
  { key: "all", label: "Tout" },
  { key: "addition", label: "Addition" },
  { key: "subtraction", label: "Soustraction" },
  { key: "multiplication", label: "Multiplication" },
  { key: "division", label: "Division" },
  { key: "advanced", label: "Avancé" },
];

export default function TrainClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core state
  const [loading, setLoading] = useState(true);
  const [currentExercise, setCurrentExercise] = useState<NextExercise | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isNegative, setIsNegative] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerState, setAnswerState] = useState<"idle" | "correct">("idle");
  const [correctDisplay, setCorrectDisplay] = useState("");

  // Session
  const [sessionStartTime] = useState(Date.now());
  const [exerciseStartTime, setExerciseStartTime] = useState(Date.now());
  const [totalExercises, setTotalExercises] = useState(0);
  const [globalLevel, setGlobalLevel] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Training mode (from query or dashboard)
  const [trainingMode, setTrainingMode] = useState<string | null>(null);
  const [operationFilter, setOperationFilter] = useState<string[]>([]);
  const [showOpDropdown, setShowOpDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const opDropdownRef = useRef<HTMLDivElement>(null);
  const opButtonRef = useRef<HTMLButtonElement>(null);
  const opMenuRef = useRef<HTMLDivElement>(null);

  // Series of 10
  const [seriesResults, setSeriesResults] = useState<SeriesResult[]>([]);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [showPause, setShowPause] = useState(false);
  const [seriesStartTime, setSeriesStartTime] = useState(Date.now());

  // Skill score tracking (before/after series)
  const [skillScoresBefore, setSkillScoresBefore] = useState<Record<string, number>>({});
  const [skillScoresAfter, setSkillScoresAfter] = useState<Record<string, number>>({});

  // User weaknesses (from dashboard)
  const [userWeaknesses, setUserWeaknesses] = useState<{ name: string; label: string; score: number }[]>([]);

  // Custom series from example expression
  const [customSeriesPool, setCustomSeriesPool] = useState<NextExercise[]>([]);
  const [customSeriesExample, setCustomSeriesExample] = useState<string | null>(null);
  const customPoolIdx = useRef(0);

  // Loading state for buttons on pause screen
  const [seriesLoading, setSeriesLoading] = useState(false);

  // Settings
  const [showHints, setShowHints] = useState(true);

  // Voice mode
  const [voiceMode, setVoiceMode] = useState(false);

  // Speed mode (QCM)
  const [speedChoices, setSpeedChoices] = useState<string[]>([]);
  const [speedPicked, setSpeedPicked] = useState<string | null>(null);

  // Paywall
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const FREE_LIMIT = 100;

  // i18n (kept for compatibility; may be used by child components)
  useTranslation();

  // Ref to avoid stale closure in auto-submit effect
  const exerciseRef = useRef<NextExercise | null>(null);

  // Chat (only user-initiated)
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mobile coach bottom sheet
  const [coachOpen, setCoachOpen] = useState(false);

  // Input ref for keyboard focus
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode) setTrainingMode(mode);
  }, [searchParams]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Close operation dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (opDropdownRef.current && !opDropdownRef.current.contains(target) && opMenuRef.current && !opMenuRef.current.contains(target)) {
        setShowOpDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      // Read mode from URL immediately so loadNextExercise has it
      const urlMode = searchParams.get("mode");
      if (urlMode) setTrainingMode(urlMode);

      try {
        const state = await api.getAgentState();
        setTotalExercises(state.instance.state.total_exercises || 0);
        setGlobalLevel(state.instance.state.global_level || 0);
      } catch {}

      // Check subscription status
      try {
        const sub = await api.getSubscriptionStatus();
        if (sub.plan !== "free" && sub.active) {
          setIsPremium(true);
        } else if (sub.total_exercises >= 100) {
          setShowPaywall(true);
        }
      } catch {}

      // Fetch baseline skill scores for delta tracking
      try {
        const dash = await api.getDashboard();
        const before: Record<string, number> = {};
        dash.skills.forEach((s) => {
          before[s.name] = s.score;
        });
        setSkillScoresBefore(before);
        const weakSkills = dash.skills
          .filter((s) => s.attempts >= 1)
          .sort((a, b) => a.score - b.score)
          .slice(0, 3);
        setUserWeaknesses(weakSkills.map((s) => ({ name: s.name, label: s.label, score: Math.round(s.score) })));
      } catch {}

      await loadNextExercise({ mode: urlMode || undefined });
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep focus on hidden input for keyboard
  useEffect(() => {
    if (!showPause && !loading) inputRef.current?.focus();
  }, [currentExercise, showPause, loading]);

  const loadNextExercise = useCallback(
    async (overrides?: { mode?: string; operation?: string[] }) => {
      try {
        let exercise: NextExercise;
        if (customSeriesPool.length > 0 && customPoolIdx.current < customSeriesPool.length) {
          exercise = customSeriesPool[customPoolIdx.current];
          customPoolIdx.current++;
        } else {
          const mode = overrides?.mode ?? trainingMode;
          const ops = overrides?.operation ?? operationFilter;
          exercise = await api.getNextExercise(mode || undefined, ops.length > 0 ? ops : undefined);
        }

        setCurrentExercise(exercise);
        setExerciseStartTime(Date.now());
        setUserInput("");
        setIsNegative(false);
        setCorrectDisplay("");
        setAnswerState("idle");
        setSpeedPicked(null);

        const effectiveMode = overrides?.mode ?? trainingMode;
        if (effectiveMode === "speed" && exercise.correct_answer) {
          const correct = parseInt(exercise.correct_answer, 10);
          const wrongSet = new Set<number>();
          while (wrongSet.size < 3) {
            const offset = Math.floor(Math.random() * Math.max(10, Math.abs(correct) * 0.3)) + 1;
            const sign = Math.random() < 0.5 ? 1 : -1;
            const wrong = correct + offset * sign;
            if (wrong !== correct) wrongSet.add(wrong);
          }
          const allChoices = [exercise.correct_answer, ...Array.from(wrongSet).map(String)];
          for (let i = allChoices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
          }
          setSpeedChoices(allChoices);
        }

        setTimeout(() => inputRef.current?.focus(), 50);
      } catch (err) {
        console.error("Failed to load exercise:", err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trainingMode, operationFilter, customSeriesPool]
  );

  useEffect(() => {
    exerciseRef.current = currentExercise;
  }, [currentExercise]);

  useEffect(() => {
    if (trainingMode === "speed") return;
    if (!userInput.trim() || isSubmitting || showPause || answerState === "correct") return;
    const exercise = exerciseRef.current;
    if (exercise?.correct_answer) {
      const correctDigits = exercise.correct_answer.replace("-", "");
      if (userInput.length < correctDigits.length) return;
    }
    handleSubmitAnswer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInput, isNegative, isSubmitting]);

  async function handleSubmitAnswer() {
    const exercise = exerciseRef.current;
    if (!exercise || !userInput.trim() || isSubmitting || answerState === "correct") return;

    const finalAnswer = isNegative ? `-${userInput}` : userInput;
    const timeTaken = Date.now() - exerciseStartTime;

    if (exercise.correct_answer && finalAnswer === exercise.correct_answer) {
      setCorrectDisplay(finalAnswer);
      setAnswerState("correct");
      setTotalExercises((prev) => {
        const next = prev + 1;
        if (!isPremium && next >= FREE_LIMIT) setTimeout(() => setShowPaywall(true), 600);
        return next;
      });

      const sr: SeriesResult = {
        question: exercise.question,
        correct_answer: exercise.correct_answer,
        user_answer: finalAnswer,
        is_correct: true,
        time_ms: timeTaken,
        error_type: null,
        technique_tip: null,
        skill_name: exercise.exercise_type,
      };
      const newResults = [...seriesResults, sr];
      setSeriesResults(newResults);
      const newIdx = seriesIndex + 1;
      setSeriesIndex(newIdx);

      if (newIdx >= SERIES_SIZE) setTimeout(() => setShowPause(true), 400);
      else setTimeout(() => loadNextExercise(), 350);

      api
        .submitAnswer(exercise.exercise_id, finalAnswer, timeTaken)
        .then((result) => {
          if (result.global_level) setGlobalLevel(result.global_level);
          if (result.skill_name && result.skill_score != null) {
            setSkillScoresAfter((prev) => ({ ...prev, [result.skill_name!]: result.skill_score! }));
          }
        })
        .catch(() => {});
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await api.submitAnswer(exercise.exercise_id, finalAnswer, timeTaken);
      if (result.is_correct) {
        setCorrectDisplay(finalAnswer);
        setAnswerState("correct");
        setGlobalLevel(result.global_level || globalLevel);
        setTotalExercises((prev) => prev + 1);
        if (result.skill_name && result.skill_score != null) {
          setSkillScoresAfter((prev) => ({ ...prev, [result.skill_name!]: result.skill_score! }));
        }

        const sr: SeriesResult = {
          question: exercise.question,
          correct_answer: result.correct_answer,
          user_answer: finalAnswer,
          is_correct: true,
          time_ms: timeTaken,
          error_type: null,
          technique_tip: result.technique_tip,
          skill_name: result.skill_name,
        };
        const newResults = [...seriesResults, sr];
        setSeriesResults(newResults);
        const newIdx = seriesIndex + 1;
        setSeriesIndex(newIdx);

        if (newIdx >= SERIES_SIZE) setTimeout(() => setShowPause(true), 400);
        else setTimeout(() => loadNextExercise(), 350);
      }
    } catch (err: any) {
      if (err?.message?.includes("expired") || err?.message?.includes("not found")) loadNextExercise();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSpeedChoice(choice: string) {
    const exercise = exerciseRef.current;
    if (!exercise || answerState === "correct" || speedPicked !== null) return;

    const timeTaken = Date.now() - exerciseStartTime;
    const isCorrect = choice === exercise.correct_answer;

    setSpeedPicked(choice);

    if (isCorrect) {
      setCorrectDisplay(choice);
      setAnswerState("correct");
      setTotalExercises((prev) => prev + 1);

      const sr: SeriesResult = {
        question: exercise.question,
        correct_answer: exercise.correct_answer || choice,
        user_answer: choice,
        is_correct: true,
        time_ms: timeTaken,
        error_type: null,
        technique_tip: null,
        skill_name: exercise.exercise_type,
      };
      const newResults = [...seriesResults, sr];
      setSeriesResults(newResults);
      const newIdx = seriesIndex + 1;
      setSeriesIndex(newIdx);

      if (newIdx >= SERIES_SIZE) setTimeout(() => setShowPause(true), 400);
      else setTimeout(() => loadNextExercise(), 500);

      api
        .submitAnswer(exercise.exercise_id, choice, timeTaken)
        .then((result) => {
          if (result.global_level) setGlobalLevel(result.global_level);
          if (result.skill_name && result.skill_score != null) {
            setSkillScoresAfter((prev) => ({ ...prev, [result.skill_name!]: result.skill_score! }));
          }
        })
        .catch(() => {});
    } else {
      const sr: SeriesResult = {
        question: exercise.question,
        correct_answer: exercise.correct_answer || "?",
        user_answer: choice,
        is_correct: false,
        time_ms: timeTaken,
        error_type: "wrong_choice",
        technique_tip: null,
        skill_name: exercise.exercise_type,
      };
      const newResults = [...seriesResults, sr];
      setSeriesResults(newResults);
      const newIdx = seriesIndex + 1;
      setSeriesIndex(newIdx);
      setTotalExercises((prev) => prev + 1);

      setCorrectDisplay(exercise.correct_answer || "?");
      setTimeout(() => {
        setAnswerState("idle");
        if (newIdx >= SERIES_SIZE) setShowPause(true);
        else loadNextExercise();
      }, 800);

      api.submitAnswer(exercise.exercise_id, choice, timeTaken).catch(() => {});
    }
  }

  async function handleStartNewSeries() {
    if (seriesLoading) return;
    setSeriesLoading(true);
    setCustomSeriesPool([]);
    setCustomSeriesExample(null);
    customPoolIdx.current = 0;
    setSeriesResults([]);
    setSeriesIndex(0);
    setSeriesStartTime(Date.now());
    setSkillScoresBefore((prev) => ({ ...prev, ...skillScoresAfter }));
    setSkillScoresAfter({});
    await loadNextExercise();
    setSeriesLoading(false);
    setShowPause(false);
  }

  async function handleReplayCustomSeries() {
    if (!customSeriesExample || seriesLoading) return;
    setSeriesLoading(true);
    try {
      const res = await api.generateCustomSeries(customSeriesExample, SERIES_SIZE);
      if (res.exercises.length > 0) {
        setCustomSeriesPool(res.exercises);
        customPoolIdx.current = 1;
        setSeriesResults([]);
        setSeriesIndex(0);
        setSeriesStartTime(Date.now());
        setSkillScoresBefore((prev) => ({ ...prev, ...skillScoresAfter }));
        setSkillScoresAfter({});
        const first = res.exercises[0];
        setCurrentExercise(first);
        setExerciseStartTime(Date.now());
        setUserInput("");
        setIsNegative(false);
        setCorrectDisplay("");
        setAnswerState("idle");
        setTimeout(() => inputRef.current?.focus(), 50);
        setShowPause(false);
      }
    } catch {} finally {
      setSeriesLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showPause) {
      if (e.key === "Enter" || e.key === " ") handleStartNewSeries();
      return;
    }
    if (e.key === "Backspace") setUserInput((prev) => prev.slice(0, -1));
    else if (e.key === "-") setIsNegative((prev) => !prev);
    else if (/^[0-9]$/.test(e.key)) setUserInput((prev) => prev + e.key);
  }

  function handleVoiceAnswer(answer: string) {
    const exercise = exerciseRef.current;
    if (!exercise) return;

    const timeTaken = Date.now() - exerciseStartTime;
    const isCorrect = exercise.correct_answer ? answer === exercise.correct_answer : false;

    if (isCorrect) {
      setCorrectDisplay(answer);
      setAnswerState("correct");
      setTotalExercises((prev) => prev + 1);

      const sr: SeriesResult = {
        question: exercise.question,
        correct_answer: exercise.correct_answer || answer,
        user_answer: answer,
        is_correct: true,
        time_ms: timeTaken,
        error_type: null,
        technique_tip: null,
        skill_name: exercise.exercise_type,
      };
      const newResults = [...seriesResults, sr];
      setSeriesResults(newResults);
      const newIdx = seriesIndex + 1;
      setSeriesIndex(newIdx);

      if (newIdx >= SERIES_SIZE) setTimeout(() => setShowPause(true), 800);

      api
        .submitAnswer(exercise.exercise_id, answer, timeTaken)
        .then((result) => {
          if (result.global_level) setGlobalLevel(result.global_level);
          if (result.skill_name && result.skill_score != null) {
            setSkillScoresAfter((prev) => ({ ...prev, [result.skill_name!]: result.skill_score! }));
          }
        })
        .catch(() => {});
    } else {
      const sr: SeriesResult = {
        question: exercise.question,
        correct_answer: exercise.correct_answer || "?",
        user_answer: answer,
        is_correct: false,
        time_ms: timeTaken,
        error_type: null,
        technique_tip: null,
        skill_name: exercise.exercise_type,
      };
      const newResults = [...seriesResults, sr];
      setSeriesResults(newResults);
      const newIdx = seriesIndex + 1;
      setSeriesIndex(newIdx);
      if (newIdx >= SERIES_SIZE) setTimeout(() => setShowPause(true), 800);
    }
  }

  function handleVoiceNextExercise() {
    loadNextExercise();
  }

  function handleNumpadClick(value: string) {
    if (value === "DEL") setUserInput((prev) => prev.slice(0, -1));
    else if (value === "±") setIsNegative((prev) => !prev);
    else setUserInput((prev) => prev + value);
    inputRef.current?.focus();
  }

  const SUGGESTION_CHIPS = [
    { label: "Carrés", text: "Donne moi des carrés" },
    { label: "Tables ×7", text: "Tables de 7" },
    { label: "Additions faciles", text: "Additions faciles" },
    { label: "Mult. difficiles", text: "Multiplications difficiles" },
    { label: "Chaînes +−", text: "34-54+67-23-65" },
    { label: "Divisions", text: "Divisions niveau moyen" },
  ];

  const COMMON_QUESTIONS = [
    { label: "Comment multiplier par 11 ?", text: "Comment multiplier par 11 rapidement ?" },
    { label: "Astuce pour les carrés", text: "Quelle est l'astuce pour calculer les carrés ?" },
    { label: "Diviser par 5 facilement", text: "Comment diviser par 5 facilement ?" },
    { label: "C'est quoi la décomposition ?", text: "Explique moi la technique de décomposition" },
  ];

  function matchLocalIntent(msg: string): { skill: string; difficulty: number; description: string } | null {
    const m = msg.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/carr[eé]s?|square/.test(m)) return { skill: "squares_1_30", difficulty: m.includes("difficile") || m.includes("dur") ? 4 : 2, description: "Carrés" };
    if (/table/.test(m)) return { skill: "tables_1_20", difficulty: 2, description: "Tables de multiplication" };
    if (/addition/.test(m)) return { skill: "addition", difficulty: m.includes("difficile") || m.includes("dur") ? 4 : m.includes("facile") ? 1 : 2, description: "Additions" };
    if (/soustraction/.test(m)) return { skill: "subtraction", difficulty: m.includes("difficile") || m.includes("dur") ? 4 : m.includes("facile") ? 1 : 2, description: "Soustractions" };
    if (/multipli/.test(m)) return { skill: "multiplication", difficulty: m.includes("difficile") || m.includes("dur") ? 4 : m.includes("facile") ? 1 : 2, description: "Multiplications" };
    if (/division/.test(m)) return { skill: "division", difficulty: m.includes("difficile") || m.includes("dur") ? 4 : m.includes("facile") ? 1 : 2, description: "Divisions" };
    if (/chaine|enchaine|chain/.test(m)) return { skill: "chain", difficulty: 2, description: "Chaînes de calcul" };
    if (/mixte|melange|mix/.test(m)) return { skill: "mixed", difficulty: 2, description: "Opérations mixtes" };
    if (/avance|vedique|croise/.test(m)) return { skill: "advanced", difficulty: 3, description: "Techniques avancées" };
    if (/decompos|factori/.test(m)) return { skill: "decomposition", difficulty: 2, description: "Décompositions" };
    if (/rapide|\*5|\*9|\*11|\*25|\*99|fois 5|fois 9|fois 11/.test(m)) return { skill: "fast_multiplication", difficulty: 2, description: "Mult. rapides" };
    return null;
  }

  function isMathExpression(s: string): boolean {
    const cleaned = s.replace(/\s/g, "");
    return /^\d+([+\-*/×÷−]\d+)+$/.test(cleaned);
  }

  function launchCustomSeries(exercises: NextExercise[], label: string) {
    setCustomSeriesExample(label);
    setCustomSeriesPool(exercises);
    customPoolIdx.current = 1;
    setSeriesResults([]);
    setSeriesIndex(0);
    setShowPause(false);
    setSeriesStartTime(Date.now());
    setSkillScoresAfter({});
    const first = exercises[0];
    setCurrentExercise(first);
    setExerciseStartTime(Date.now());
    setUserInput("");
    setIsNegative(false);
    setCorrectDisplay("");
    setAnswerState("idle");
    setSpeedPicked(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleWeaknessTraining() {
    if (userWeaknesses.length === 0) return;
    setMessages((prev) => [
      ...prev,
      { role: "agent", message: `🎯 Série ciblée sur tes faiblesses : ${userWeaknesses.map((w) => w.label).join(", ")}. C'est parti !`, timestamp: Date.now() },
    ]);
    try {
      const perSkill = Math.ceil(SERIES_SIZE / userWeaknesses.length);
      const allExercises: NextExercise[] = [];
      for (const w of userWeaknesses) {
        const difficulty = Math.max(1, Math.min(3, Math.round(w.score / 20)));
        const res = await api.generateSkillSeries(w.name, difficulty, perSkill);
        allExercises.push(...res.exercises);
      }
      for (let i = allExercises.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allExercises[i], allExercises[j]] = [allExercises[j], allExercises[i]];
      }
      const finalList = allExercises.slice(0, SERIES_SIZE);
      if (finalList.length > 0) launchCustomSeries(finalList, "Faiblesses ciblées");
    } catch {
      setMessages((prev) => [...prev, { role: "agent", message: "Erreur lors de la génération. Réessaie.", timestamp: Date.now() }]);
    }
  }

  async function handleSendChat() {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", message: msg, timestamp: Date.now() }]);

    if (isMathExpression(msg)) {
      setMessages((prev) => [...prev, { role: "agent", message: `🎯 Je génère ${SERIES_SIZE} calculs similaires...`, timestamp: Date.now() }]);
      try {
        const res = await api.generateCustomSeries(msg, SERIES_SIZE);
        if (res.exercises.length > 0) {
          launchCustomSeries(res.exercises, msg);
          setMessages((prev) => [...prev, { role: "agent", message: `✅ C'est parti ! ${res.exercises.length} calculs`, timestamp: Date.now() }]);
        }
      } catch {
        setMessages((prev) => [...prev, { role: "agent", message: "Désolé, je n'ai pas pu générer les exercices.", timestamp: Date.now() }]);
      }
      return;
    }

    const localIntent = matchLocalIntent(msg);
    if (localIntent) {
      setMessages((prev) => [...prev, { role: "agent", message: `🎯 ${localIntent.description} — génération...`, timestamp: Date.now() }]);
      try {
        const res = await api.generateSkillSeries(localIntent.skill, localIntent.difficulty, SERIES_SIZE);
        if (res.exercises.length > 0) {
          launchCustomSeries(res.exercises, msg);
          setMessages((prev) => {
            const copy = [...prev];
            copy.pop();
            return [...copy, { role: "agent", message: `🎯 ${localIntent.description} — ${res.exercises.length} calculs. C'est parti !`, timestamp: Date.now() }];
          });
        }
      } catch {
        setMessages((prev) => [...prev, { role: "agent", message: "Erreur lors de la génération.", timestamp: Date.now() }]);
      }
      return;
    }

    setMessages((prev) => [...prev, { role: "agent", message: "🤔 Je réfléchis...", timestamp: Date.now() }]);
    try {
      const res = await api.smartSeries(msg, SERIES_SIZE);
      setMessages((prev) => prev.slice(0, -1));
      if (res.is_exercise_request && res.exercises.length > 0) {
        const desc = res.description || "Série personnalisée";
        launchCustomSeries(res.exercises, res.example_used || msg);
        setMessages((prev) => [...prev, { role: "agent", message: `🎯 ${desc} — ${res.exercises.length} calculs. C'est parti !`, timestamp: Date.now() }]);
      } else if (res.chat_response) {
        setMessages((prev) => [...prev, { role: "agent", message: res.chat_response!, timestamp: Date.now() }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            message: "Désolé, je n'ai pas compris. Essaie un exemple comme '34+56-12' ou 'donne moi des carrés'.",
            timestamp: Date.now(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length > 0 && copy[copy.length - 1].message === "🤔 Je réfléchis...") copy.pop();
        return [...copy, { role: "agent", message: "Erreur de connexion. Réessaie.", timestamp: Date.now() }];
      });
    }
  }

  function handleModeChange(mode: string) {
    setTrainingMode(mode);
    api.setTrainingMode(mode).catch(() => {});
    setSeriesResults([]);
    setSeriesIndex(0);
    setShowPause(false);
    loadNextExercise({ mode });
  }

  function handleOperationChange(op: string) {
    let newFilter: string[];
    if (op === "all") newFilter = [];
    else {
      const current = [...operationFilter];
      const idx = current.indexOf(op);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(op);
      newFilter = current;
    }
    setOperationFilter(newFilter);
    setSeriesResults([]);
    setSeriesIndex(0);
    setShowPause(false);
    loadNextExercise({ operation: newFilter });
  }

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
  const displayAnswer = answerState === "correct" ? correctDisplay : (isNegative ? "-" : "") + (userInput || "");

  if (showPause) {
    const totalTime = seriesResults.reduce((s, r) => s + r.time_ms, 0);
    const avgTime = Math.round(totalTime / seriesResults.length);
    const wrongResults = seriesResults.filter((r) => !r.is_correct);
    const tips = wrongResults
      .map((r) => r.technique_tip)
      .filter((t): t is string => !!t)
      .filter((t, i, a) => a.indexOf(t) === i);

    const SKILL_LABELS: Record<string, string> = {
      addition: "Addition",
      subtraction: "Soustraction",
      multiplication: "Multiplication",
      division: "Division",
      advanced: "Avancé",
      tables_1_20: "Tables",
      squares_1_30: "Carrés",
      decomposition: "Décompositions",
      fast_multiplication: "Mult. rapides",
      mixed: "Mixte",
      chain: "Chaînes",
    };
    const skillsInSeries = Array.from(new Set(seriesResults.map((r) => r.skill_name || "other")));

    return (
      <div
        className="h-[calc(100vh-6.5rem)] flex items-center justify-center overflow-y-auto"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleStartNewSeries();
        }}
        tabIndex={0}
      >
        <div className="max-w-lg w-full p-4 space-y-4">
          <div className="bento-card p-6">
            <div className="text-center mb-4">
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Série terminée ! 🎯</h2>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="text-xs text-slate-500">
                  Temps moy. <span className="font-bold text-slate-900">{(avgTime / 1000).toFixed(1)}s</span>
                </span>
                <span className="text-xs text-slate-500">
                  Durée{" "}
                  <span className="font-bold text-slate-900">
                    {totalTime < 60000
                      ? `${Math.round(totalTime / 1000)}s`
                      : `${Math.floor(totalTime / 60000)}m${String(Math.round((totalTime % 60000) / 1000)).padStart(2, "0")}s`}
                  </span>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {skillsInSeries.map((skill) => {
                const after = skillScoresAfter[skill];
                const before = skillScoresBefore[skill];
                const hasScore = after != null;
                const score = hasScore ? Math.round(after) : null;
                const delta = hasScore && before != null ? Math.round(after - before) : null;
                const isUp = delta != null && delta > 0;
                const isDown = delta != null && delta < 0;
                return (
                  <div key={skill} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-slate-50">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isUp ? "bg-green-100" : isDown ? "bg-red-100" : "bg-slate-200"
                      }`}
                    >
                      {isUp ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : isDown ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <Equal className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">{SKILL_LABELS[skill] || skill}</span>
                        <div className="flex items-center gap-2">
                          {hasScore ? (
                            <span className="text-sm font-bold text-slate-900">
                              {score}
                              <span className="text-xs font-normal text-slate-400">/100</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">…</span>
                          )}
                          {delta != null && delta !== 0 && (
                            <span className={`text-xs font-bold ${isUp ? "text-green-600" : "text-red-500"}`}>
                              {isUp ? `+${delta}` : `${delta}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1">
                        <div
                          className={`h-full rounded-full transition-all ${isUp ? "bg-green-500" : isDown ? "bg-red-400" : "bg-slate-400"}`}
                          style={{ width: `${score ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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

          {customSeriesExample && (
            <button
              onClick={handleReplayCustomSeries}
              disabled={seriesLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {seriesLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Génération...
                </>
              ) : (
                <>🔄 Relancer le même type de série</>
              )}
            </button>
          )}
          <button
            onClick={handleStartNewSeries}
            disabled={seriesLoading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            {seriesLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Chargement...
              </>
            ) : (
              <>
                Série suivante <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-2 text-slate-500 hover:text-slate-700 font-medium text-xs transition-all"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="h-[calc(100vh-5rem)] sm:h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden">
      <PaywallPopup
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSelectPlan={async (plan) => {
          try {
            const { checkout_url } = await api.createCheckout(plan);
            if (checkout_url) window.location.href = checkout_url;
          } catch (e) {
            console.error("Checkout error:", e);
          }
        }}
      />

      <input
        ref={inputRef}
        type="text"
        inputMode="none"
        className="fixed opacity-0 w-0 h-0 caret-transparent focus:outline-none"
        style={{ top: '-9999px', left: '-9999px' }}
        onKeyDown={handleKeyDown}
        autoFocus
        tabIndex={0}
      />

      <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5">
        <div className="col-span-2 bento-card p-2.5 flex items-center gap-2 overflow-hidden">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {[{ key: "free", label: "Libre" }, { key: "tables", label: "Tables" }].map((m) => (
              <button
                key={m.key}
                onClick={() => handleModeChange(m.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  (trainingMode || "free") === m.key ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200 flex-shrink-0" />

          <div ref={opDropdownRef} className="flex-1 min-w-0">
            <button
              ref={opButtonRef}
              onClick={() => {
                if (!showOpDropdown && opButtonRef.current) {
                  const rect = opButtonRef.current.getBoundingClientRect();
                  setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                }
                setShowOpDropdown(!showOpDropdown);
              }}
              className="w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
            >
              {operationFilter.length === 0
                ? "Tout"
                : operationFilter.length === 1
                  ? OPERATION_OPTIONS.find((o) => o.key === operationFilter[0])?.label
                  : `${operationFilter.length} types`}
              <ChevronDown className={`w-4 h-4 transition-transform ${showOpDropdown ? "rotate-180" : ""}`} />
            </button>
            {showOpDropdown &&
              createPortal(
                <div
                  ref={opMenuRef}
                  className="w-48 bg-white rounded-xl border border-slate-200 shadow-2xl py-1 overflow-hidden"
                  style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999 }}
                >
                  <button
                    onClick={() => handleOperationChange("all")}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-all ${
                      operationFilter.length === 0 ? "bg-slate-900 text-white font-medium" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        operationFilter.length === 0 ? "bg-white border-white" : "border-slate-300"
                      }`}
                    >
                      {operationFilter.length === 0 && <Check className="w-3 h-3 text-slate-900" />}
                    </div>
                    Tout
                  </button>
                  <div className="h-px bg-slate-100 mx-2" />
                  {OPERATION_OPTIONS.filter((o) => o.key !== "all").map((op) => {
                    const isSelected = operationFilter.includes(op.key);
                    return (
                      <button
                        key={op.key}
                        onClick={() => handleOperationChange(op.key)}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-all ${
                          isSelected ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "bg-slate-900 border-slate-900" : "border-slate-300"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {op.label}
                      </button>
                    );
                  })}
                </div>,
                document.body
              )}
          </div>
        </div>

        <div className="bento-card p-2.5 flex items-center gap-2">
          {/* Mobile: Coach IA button */}
          <button
            onClick={() => setCoachOpen(true)}
            className="sm:hidden relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-600 border border-purple-200 active:scale-95 transition-all flex-shrink-0"
            aria-label="Ouvrir le Coach IA"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {messages.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                {messages.length}
              </span>
            )}
          </button>

          {/* Desktop: progress dots */}
          <div className="hidden sm:flex gap-1">
            {Array.from({ length: SERIES_SIZE }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < seriesIndex ? (seriesResults[i]?.is_correct ? "bg-green-500" : "bg-red-400") : i === seriesIndex ? "bg-slate-900 scale-125" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          <span className="text-xs font-bold text-slate-600 sm:ml-0">
            {seriesIndex}/{SERIES_SIZE}
          </span>
        </div>

        <div className="bento-card p-2.5 flex items-center justify-end gap-2.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-mono font-bold text-slate-600">
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </span>
          </div>
          <button
            onClick={() => setVoiceMode(!voiceMode)}
            title={voiceMode ? "Désactiver le mode vocal" : "Activer le mode vocal"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              voiceMode ? "bg-purple-100 text-purple-600 border border-purple-200" : "bg-slate-100 text-slate-400 border border-slate-200"
            }`}
          >
            {voiceMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">Vocal</span>
          </button>
          <button
            onClick={() => setShowHints(!showHints)}
            title={showHints ? "Masquer les aides" : "Afficher les aides"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showHints ? "bg-blue-100 text-blue-600 border border-blue-200" : "bg-slate-100 text-slate-400 border border-slate-200"
            }`}
          >
            {showHints ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="hidden sm:inline">Aides</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2.5 px-2.5 pb-2.5 min-h-0">
        <div className="hidden lg:flex lg:col-span-1 bento-card flex-col min-h-0 overflow-hidden">
          {voiceMode ? (
            <VoiceTrainer
              currentExercise={currentExercise}
              onAnswer={handleVoiceAnswer}
              onNextExercise={handleVoiceNextExercise}
              loading={loading}
              seriesIndex={seriesIndex}
              seriesSize={SERIES_SIZE}
              showPause={showPause}
            />
          ) : (
            <>
              <div className="flex-shrink-0 p-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <h2 className="font-bold text-sm text-slate-900">Coach IA</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {messages.length === 0 && (
                  <div className="mt-3 space-y-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Types de calcul</p>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {SUGGESTION_CHIPS.map((chip) => (
                          <button
                            key={chip.label}
                            onClick={() => setChatInput(chip.text)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-all border border-slate-200 hover:border-slate-300"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Questions fréquentes</p>
                      <div className="flex flex-col gap-1">
                        {COMMON_QUESTIONS.map((q) => (
                          <button
                            key={q.label}
                            onClick={() => setChatInput(q.text)}
                            className="px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-xs font-medium text-purple-700 transition-all border border-purple-100 hover:border-purple-200 text-left"
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {userWeaknesses.length > 0 && (
                      <div className="pt-1">
                        <button
                          onClick={handleWeaknessTraining}
                          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                          <span>🎯</span>
                          <span>Travailler mes faiblesses</span>
                        </button>
                        <p className="text-[10px] text-slate-400 text-center mt-1.5">
                          {userWeaknesses.map((w) => `${w.label} (${w.score})`).join(" · ")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === "user" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 border border-slate-100"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="flex-shrink-0 p-2.5 border-t border-slate-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        handleSendChat();
                      }
                    }}
                    placeholder="Pose-moi une question..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-primary focus:outline-none text-sm"
                  />
                  <button onClick={handleSendChat} className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="col-span-1 lg:col-span-3 bento-card flex flex-col items-center justify-center relative min-h-0 overflow-hidden" onClick={() => inputRef.current?.focus()}>
          {currentExercise && (
            <>
              <div className="text-5xl lg:text-7xl font-extrabold text-slate-900 mb-5 text-center tracking-tight select-none">{currentExercise.question}</div>

              {trainingMode === "speed" ? (
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs sm:max-w-sm px-4">
                  {speedChoices.map((choice) => {
                    const isCorrectChoice = choice === currentExercise.correct_answer;
                    const isPicked = speedPicked === choice;
                    const showResult = speedPicked !== null;
                    let btnClass = "bg-white border-2 border-slate-200 text-slate-900 hover:border-primary hover:bg-primary/5";
                    if (showResult && isCorrectChoice) btnClass = "bg-green-100 border-2 border-green-400 text-green-700";
                    else if (showResult && isPicked && !isCorrectChoice) btnClass = "bg-red-100 border-2 border-red-400 text-red-700";
                    return (
                      <button
                        key={choice}
                        onClick={() => handleSpeedChoice(choice)}
                        disabled={speedPicked !== null}
                        className={`py-6 rounded-2xl font-bold text-2xl sm:text-3xl transition-all duration-150 select-none ${btnClass}`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="mb-4 w-full max-w-xs sm:max-w-sm px-4">
                    <div
                      className={`rounded-2xl border-2 px-8 py-3 text-center text-4xl font-mono min-h-[56px] flex items-center justify-center transition-all duration-150 bg-white ${
                        answerState === "correct" ? "border-green-400 bg-green-50/50" : "border-slate-200"
                      }`}
                    >
                      <span className={answerState === "correct" ? "text-green-500" : "text-slate-900"}>
                        {displayAnswer || <span className="text-slate-300">?</span>}
                      </span>
                    </div>
                    <p className="hidden sm:block text-[11px] text-slate-400 text-center mt-1.5">Clavier ou pavé numérique</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full max-w-xs sm:max-w-sm px-4">
                    {["7", "8", "9", "4", "5", "6", "1", "2", "3", "±", "0", "DEL"].map((key) => (
                      <button
                        key={key}
                        onClick={() => handleNumpadClick(key)}
                        className={`h-14 sm:h-16 rounded-2xl font-bold text-xl transition-all duration-100 select-none ${
                          key === "DEL"
                            ? "bg-slate-200 text-slate-600 hover:bg-slate-300 active:bg-slate-400"
                            : key === "±"
                              ? `${isNegative ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600"} hover:bg-blue-400 hover:text-white`
                              : "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 active:bg-slate-100"
                        }`}
                      >
                        {key === "±" ? <Minus className="w-5 h-5 mx-auto" /> : key}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {showHints && currentExercise.tip && (
                <div className="mt-3 w-full max-w-xs sm:max-w-sm px-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center text-xs text-slate-500">💡 {currentExercise.tip}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

      {/* Overlay */}
      {coachOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setCoachOpen(false)}
        />
      )}

      {/* Bottom Sheet — Coach IA (mobile only) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 lg:hidden bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          coachOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "78vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h2 className="font-bold text-sm text-slate-900">Coach IA</h2>
          </div>
          <button
            onClick={() => setCoachOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {messages.length === 0 && (
            <div className="mt-3 space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Types de calcul</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {SUGGESTION_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => setChatInput(chip.text)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600 transition-all border border-slate-200 hover:border-slate-300"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Questions fréquentes</p>
                <div className="flex flex-col gap-1">
                  {COMMON_QUESTIONS.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => setChatInput(q.text)}
                      className="px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-xs font-medium text-purple-700 transition-all border border-purple-100 hover:border-purple-200 text-left"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
              {userWeaknesses.length > 0 && (
                <div className="pt-1">
                  <button
                    onClick={() => { handleWeaknessTraining(); setCoachOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    <span>🎯</span>
                    <span>Travailler mes faiblesses</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5">
                    {userWeaknesses.map((w) => `${w.label} (${w.score})`).join(" · ")}
                  </p>
                </div>
              )}
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 border border-slate-100"
                }`}
              >
                {msg.message}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div className="flex-shrink-0 p-3 border-t border-slate-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  handleSendChat();
                }
              }}
              placeholder="Pose-moi une question..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-primary focus:outline-none text-sm"
            />
            <button onClick={handleSendChat} className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

