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
import { api, NextExercise, SlowExerciseItem } from "@/lib/api";
import VoiceTrainer from "@/components/VoiceTrainer";
import PaywallPopup from "@/components/PaywallPopup";
import CoachSuggestionModal from "@/components/CoachSuggestionModal";
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

const SERIES_SIZE = 20;

const EXCLUSIVE_MODES = [
  { key: "adaptive", label: "Adaptatif" },
  { key: "multiple_choice", label: "Choix multiple" },
  { key: "tables", label: "Tables 1-20" },
  { key: "advanced", label: "Avancé" },
  { key: "chain_add_sub", label: "Chaîne +−" },
  { key: "chain_add_sub_mul", label: "Chaîne +−×" },
];

const COMBINABLE_MODES = [
  { key: "addition", label: "Addition" },
  { key: "subtraction", label: "Soustraction" },
  { key: "multiplication", label: "Multiplication" },
  { key: "division", label: "Division" },
];

const EXCLUSIVE_KEYS = new Set(EXCLUSIVE_MODES.map((m) => m.key));

function modeToApiParams(modes: string[]): { apiMode: string; apiOps: string[] | undefined } {
  if (modes.length === 0 || modes[0] === "adaptive" || modes[0] === "aicoach") {
    return { apiMode: "free", apiOps: undefined };
  }
  if (modes.length === 1) {
    switch (modes[0]) {
      case "multiple_choice": return { apiMode: "speed", apiOps: undefined };
      case "tables": return { apiMode: "tables", apiOps: undefined };
      case "advanced": return { apiMode: "free", apiOps: ["advanced"] };
      case "chain_add_sub": return { apiMode: "free", apiOps: ["chain"] };
      case "chain_add_sub_mul": return { apiMode: "free", apiOps: ["mixed"] };
      default: return { apiMode: "free", apiOps: [modes[0]] };
    }
  }
  return { apiMode: "free", apiOps: modes };
}

function getModeLabel(key: string): string {
  if (key === "aicoach") return "Adaptatif";
  return [...EXCLUSIVE_MODES, ...COMBINABLE_MODES].find((m) => m.key === key)?.label ?? key;
}

const SKILL_LABELS: Record<string, string> = {
  addition: "Addition",
  subtraction: "Soustraction",
  multiplication: "Multiplication",
  division: "Division",
  advanced: "Avancé",
  tables_1_20: "Tables",
  squares_1_30: "Carrés",
  fast_multiplication: "Mult. rapides",
  mixed: "Mixte",
  chain: "Chaînes",
};

const SKILL_ICONS: Record<string, string> = {
  addition: "➕",
  subtraction: "➖",
  multiplication: "✖️",
  division: "➗",
  tables_1_20: "📋",
  squares_1_30: "²",
  fast_multiplication: "⚡",
  mixed: "🔀",
  chain: "🔗",
  advanced: "🧠",
};

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

  // Active modes (unified: replaces trainingMode + operationFilter)
  const [activeModes, setActiveModes] = useState<string[]>(["adaptive"]);
  const [showOpDropdown, setShowOpDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const opDropdownRef = useRef<HTMLDivElement>(null);
  const opButtonRef = useRef<HTMLButtonElement>(null);
  const opMenuRef = useRef<HTMLDivElement>(null);

  // Series of 20
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

  // Session analysis (top 3 slowest, from backend)
  const [top3Slowest, setTop3Slowest] = useState<SlowExerciseItem[]>([]);

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
  const FREE_LIMIT = 300;
  const exercisesLimitRef = useRef(FREE_LIMIT);

  // Coach mastery suggestion popup
  const [showCoachSuggestion, setShowCoachSuggestion] = useState(false);
  const [coachSuggestionData, setCoachSuggestionData] = useState<{
    masteredSkillLabel: string;
    masteredSkillScore: number;
    weakness: { name: string; label: string; score: number };
  } | null>(null);
  const coachSuggestionShownRef = useRef(false);

  // i18n (kept for compatibility; may be used by child components)
  useTranslation();

  // Ref to avoid stale closure in auto-submit effect
  const exerciseRef = useRef<NextExercise | null>(null);

  // Pre-fetch buffer: start loading the next exercise in the background as soon
  // as the current one is displayed, so it's ready instantly when needed.
  const prefetchRef = useRef<Promise<NextExercise> | null>(null);

  // Chat (only user-initiated)
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showExerciseMenu, setShowExerciseMenu] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mobile coach bottom sheet
  const [coachOpen, setCoachOpen] = useState(false);

  // Input ref for keyboard focus
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mode = searchParams.get("mode");
    setActiveModes(mode ? mode.split(",").filter(Boolean) : ["adaptive"]);
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

  // Coach mastery suggestion: detect when a skill is well-mastered and weaknesses exist
  useEffect(() => {
    if (!showPause) {
      coachSuggestionShownRef.current = false;
      return;
    }
    if (coachSuggestionShownRef.current) return;

    const MASTERY_THRESHOLD = 75;

    // Find the dominant skill in this series (must cover ≥70% of exercises)
    const skillCounts: Record<string, number> = {};
    seriesResults.forEach((r) => {
      if (r.skill_name) skillCounts[r.skill_name] = (skillCounts[r.skill_name] || 0) + 1;
    });
    const sorted = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]);
    const dominantSkill = sorted[0]?.[0];
    if (!dominantSkill) return;
    if ((skillCounts[dominantSkill] || 0) < seriesResults.length * 0.7) return;

    // Check mastery threshold
    const skillScore = skillScoresAfter[dominantSkill];
    if (!skillScore || skillScore < MASTERY_THRESHOLD) return;

    // Find a weakness to suggest (different skill, score < 60)
    const weaknessToSuggest = userWeaknesses.find(
      (w) => w.name !== dominantSkill && w.score < 60
    );
    if (!weaknessToSuggest) return;

    coachSuggestionShownRef.current = true;
    setCoachSuggestionData({
      masteredSkillLabel: SKILL_LABELS[dominantSkill] || dominantSkill,
      masteredSkillScore: Math.round(skillScore),
      weakness: weaknessToSuggest,
    });
    setShowCoachSuggestion(true);
  }, [showPause, seriesResults, skillScoresAfter, userWeaknesses]);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      // Read mode from URL immediately so loadNextExercise has it
      const urlMode = searchParams.get("mode");
      const urlModes = urlMode ? urlMode.split(",").filter(Boolean) : ["adaptive"];
      setActiveModes(urlModes);

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
        } else {
          exercisesLimitRef.current = sub.exercises_limit;
          if (sub.total_exercises >= sub.exercises_limit) {
            setShowPaywall(true);
          }
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

      await loadNextExercise({ activeModes: urlModes });
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
    async (overrides?: { activeModes?: string[] }) => {
      try {
        let exercise: NextExercise;
        const effectiveModes = overrides?.activeModes ?? activeModes;

        if (customSeriesPool.length > 0 && customPoolIdx.current < customSeriesPool.length) {
          exercise = customSeriesPool[customPoolIdx.current];
          customPoolIdx.current++;
          // Invalidate any stale pre-fetch when using custom pool
          prefetchRef.current = null;
        } else {
          const { apiMode, apiOps } = modeToApiParams(effectiveModes);

          // Use pre-fetched exercise if available (no override forcing refresh)
          if (prefetchRef.current && !overrides) {
            try {
              exercise = await prefetchRef.current;
            } catch {
              exercise = await api.getNextExercise(apiMode, apiOps);
            }
          } else {
            exercise = await api.getNextExercise(apiMode, apiOps);
          }

          // Immediately start pre-fetching the next exercise in background
          prefetchRef.current = api.getNextExercise(apiMode, apiOps);
        }

        setCurrentExercise(exercise);
        setExerciseStartTime(Date.now());
        setUserInput("");
        setIsNegative(false);
        setCorrectDisplay("");
        setAnswerState("idle");
        setSpeedPicked(null);

        if (effectiveModes.includes("multiple_choice") && exercise.correct_answer) {
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
    [activeModes, customSeriesPool]
  );

  useEffect(() => {
    exerciseRef.current = currentExercise;
  }, [currentExercise]);

  useEffect(() => {
    if (activeModes.includes("multiple_choice")) return;
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
        if (!isPremium && next >= exercisesLimitRef.current) setTimeout(() => setShowPaywall(true), 600);
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

      if (newIdx >= SERIES_SIZE) {
        triggerSessionAnalysis(newResults);
        setTimeout(() => setShowPause(true), 400);
      } else setTimeout(() => loadNextExercise(), 350);

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

        if (newIdx >= SERIES_SIZE) {
          triggerSessionAnalysis(newResults);
          setTimeout(() => setShowPause(true), 400);
        } else setTimeout(() => loadNextExercise(), 350);
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

      if (newIdx >= SERIES_SIZE) {
        triggerSessionAnalysis(newResults);
        setTimeout(() => setShowPause(true), 400);
      } else setTimeout(() => loadNextExercise(), 500);

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
        if (newIdx >= SERIES_SIZE) {
          triggerSessionAnalysis(newResults);
          setShowPause(true);
        } else loadNextExercise();
      }, 800);

      api.submitAnswer(exercise.exercise_id, choice, timeTaken).catch(() => {});
    }
  }

  async function handleStartNewSeries() {
    if (seriesLoading) return;
    setSeriesLoading(true);
    setShowCoachSuggestion(false);
    coachSuggestionShownRef.current = false;
    setCustomSeriesPool([]);
    setCustomSeriesExample(null);
    customPoolIdx.current = 0;
    setSeriesResults([]);
    setSeriesIndex(0);
    setTop3Slowest([]);
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
    if (e.key === "Backspace") {
      if (userInput.length > 0) setUserInput((prev) => prev.slice(0, -1));
      else setIsNegative(false);
    } else if (e.key === "-") setIsNegative((prev) => !prev);
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

      if (newIdx >= SERIES_SIZE) {
        triggerSessionAnalysis(newResults);
        setTimeout(() => setShowPause(true), 800);
      }

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
      if (newIdx >= SERIES_SIZE) {
        triggerSessionAnalysis(newResults);
        setTimeout(() => setShowPause(true), 800);
      }
    }
  }

  function handleVoiceNextExercise() {
    loadNextExercise();
  }

  function handleNumpadClick(value: string) {
    if (value === "DEL") {
      if (userInput.length > 0) setUserInput((prev) => prev.slice(0, -1));
      else setIsNegative(false);
    } else if (value === "±") setIsNegative((prev) => !prev);
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

  const exerciseMenuFilter = chatInput.startsWith("/")
    ? chatInput.slice(1).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : "";
  const filteredSkills = Object.entries(SKILL_LABELS).filter(([, label]) =>
    label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(exerciseMenuFilter)
  );

  function matchLocalIntent(msg: string): { skill: string; difficulty: number; description: string } | null {
    const wordCount = msg.trim().split(/\s+/).length;
    if (msg.includes("?") || wordCount > 8) return null;
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
    setShowCoachSuggestion(false);
    coachSuggestionShownRef.current = false;
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

  async function handleExerciseMenuSelect(skill: string) {
    setChatInput("");
    setShowExerciseMenu(false);
    try {
      const res = await api.generateSkillSeries(skill, 2, SERIES_SIZE);
      if (res.exercises.length > 0) launchCustomSeries(res.exercises, SKILL_LABELS[skill]);
    } catch {
      setMessages((prev) => [...prev, { role: "agent", message: "Erreur lors de la génération.", timestamp: Date.now() }]);
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

  function handleModeSelect(key: string) {
    prefetchRef.current = null;
    let newModes: string[];

    if (EXCLUSIVE_KEYS.has(key)) {
      // Exclusive: just this one
      newModes = [key];
    } else {
      // Combinable: toggle it, clear all exclusives
      const current = activeModes.filter((m) => !EXCLUSIVE_KEYS.has(m) && m !== "aicoach");
      const idx = current.indexOf(key);
      if (idx >= 0) {
        const next = current.filter((m) => m !== key);
        newModes = next.length > 0 ? next : ["adaptive"];
      } else {
        newModes = [...current, key];
      }
    }

    setActiveModes(newModes);
    const modeStr = newModes.join(",");
    const url = new URL(window.location.href);
    url.searchParams.set("mode", modeStr);
    window.history.replaceState({}, "", url.toString());
    api.setTrainingMode(modeStr).catch(() => {});
    setSeriesResults([]);
    setSeriesIndex(0);
    setShowPause(false);
    setShowCoachSuggestion(false);
    coachSuggestionShownRef.current = false;
    loadNextExercise({ activeModes: newModes });
  }

  function triggerSessionAnalysis(results: SeriesResult[]) {
    const payload = results.map((r) => ({
      question: r.question,
      correct_answer: r.correct_answer,
      skill_name: r.skill_name,
      difficulty: (currentExercise?.difficulty ?? 1),
      time_ms: r.time_ms,
    }));
    api.analyzeSession(payload)
      .then((data) => setTop3Slowest(data.top3_slowest))
      .catch(() => {});
  }

  async function handleSwitchToWeakness() {
    setShowCoachSuggestion(false);
    if (!coachSuggestionData) return;
    const { weakness } = coachSuggestionData;
    setSeriesLoading(true);
    setShowPause(false);
    try {
      const difficulty = Math.max(1, Math.min(3, Math.round(weakness.score / 20)));
      const res = await api.generateSkillSeries(weakness.name, difficulty, SERIES_SIZE);
      if (res.exercises.length > 0) {
        launchCustomSeries(res.exercises, weakness.label);
      }
    } catch {
      await loadNextExercise();
    } finally {
      setSeriesLoading(false);
    }
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

          {top3Slowest.length > 0 && (
            <div className="bento-card p-4">
              <h3 className="font-bold text-slate-900 text-xs mb-2">🐢 Les plus lents — repasseront en priorité</h3>
              <div className="space-y-1.5">
                {top3Slowest.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-amber-50/70 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-mono text-slate-700">{item.question}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-600 font-bold">{(item.time_ms / 1000).toFixed(1)}s</span>
                      <span className="text-[10px] text-slate-400">/ cible {(item.threshold_ms / 1000).toFixed(0)}s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

  function getQuestionFontClass(q: string) {
    const len = q.length;
    if (len > 18) return "text-2xl lg:text-4xl";
    if (len > 13) return "text-3xl lg:text-5xl";
    if (len > 9)  return "text-4xl lg:text-6xl";
    return "text-5xl lg:text-7xl";
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

      {coachSuggestionData && (
        <CoachSuggestionModal
          isOpen={showCoachSuggestion}
          masteredSkillLabel={coachSuggestionData.masteredSkillLabel}
          masteredSkillScore={coachSuggestionData.masteredSkillScore}
          weakness={coachSuggestionData.weakness}
          onContinue={() => setShowCoachSuggestion(false)}
          onSwitchToWeakness={handleSwitchToWeakness}
        />
      )}

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
              {/* Mobile: count if multiple, label if single */}
              <span className="sm:hidden truncate">
                {activeModes.length === 1 ? getModeLabel(activeModes[0]) : `${activeModes.length} modes`}
              </span>
              {/* Desktop: list all labels */}
              <span className="hidden sm:block truncate">
                {activeModes.map(getModeLabel).join(", ")}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${showOpDropdown ? "rotate-180" : ""}`} />
            </button>
            {showOpDropdown &&
              createPortal(
                <div
                  ref={opMenuRef}
                  className="w-56 bg-white rounded-xl border border-slate-200 shadow-2xl py-1 overflow-hidden"
                  style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999 }}
                >
                  {/* ── Exclusive modes section ── */}
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Mode unique
                  </div>
                  {EXCLUSIVE_MODES.map((m) => {
                    const isSelected = activeModes.length === 1 && activeModes[0] === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => { handleModeSelect(m.key); setShowOpDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-all ${
                          isSelected ? "bg-slate-900 text-white font-medium" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "border-white" : "border-slate-300"
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        {m.label}
                      </button>
                    );
                  })}

                  <div className="h-px bg-slate-100 mx-2 my-1" />

                  {/* ── Combinable modes section ── */}
                  <div className="px-3 pt-1 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Combinable
                  </div>
                  {COMBINABLE_MODES.map((m) => {
                    const isSelected = activeModes.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        onClick={() => handleModeSelect(m.key)}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-all ${
                          isSelected ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-slate-900 border-slate-900" : "border-slate-300"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {m.label}
                      </button>
                    );
                  })}
                </div>,
                document.body
              )}
          </div>
        </div>

        <div className="bento-card p-2.5 flex items-center gap-2">
          {/* Mobile: Coach IA button (fills remaining space) */}
          <button
            onClick={() => setCoachOpen(true)}
            className="sm:hidden relative flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-medium bg-purple-100 text-purple-600 border border-purple-200 active:scale-95 transition-all"
            aria-label="Ouvrir le Coach IA"
          >
            <Sparkles className="w-4 h-4" />
            <span>Coach IA</span>
            {messages.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                {messages.length}
              </span>
            )}
          </button>

          {/* Progress arc (desktop + mobile) */}
          {(() => {
            const size = 44;
            const stroke = 4;
            const r = (size - stroke) / 2;
            const circ = 2 * Math.PI * r;
            const progress = seriesIndex / SERIES_SIZE;
            const dash = circ * progress;
            return (
              <div className="relative flex items-center justify-center flex-shrink-0">
                <svg width={size} height={size} className="-rotate-90">
                  {/* background track */}
                  <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
                  {/* filled arc */}
                  <circle
                    cx={size/2} cy={size/2} r={r} fill="none"
                    stroke="#0f172a"
                    strokeWidth={stroke}
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <span className="absolute text-[10px] font-extrabold text-slate-700 leading-none pointer-events-none">
                  {seriesIndex}/{SERIES_SIZE}
                </span>
              </div>
            );
          })()}
        </div>

        <div className="bento-card p-2.5 flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2.5">
          <span className="text-sm font-mono font-bold text-slate-600">
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </span>
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

      <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2.5 px-2.5 min-h-0">
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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <h2 className="font-bold text-sm text-slate-900">Coach IA</h2>
                  </div>
                  {messages.length > 0 && (
                    <button
                      onClick={() => setMessages([])}
                      title="Effacer la conversation"
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                <div className="relative">
                  {showExerciseMenu && filteredSkills.length > 0 && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                      {filteredSkills.map(([skill, label], i) => (
                        <button
                          key={skill}
                          onMouseDown={(e) => { e.preventDefault(); handleExerciseMenuSelect(skill); }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                            i === menuIndex ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{SKILL_ICONS[skill]}</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setChatInput(val);
                        setShowExerciseMenu(val.startsWith("/"));
                        setMenuIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (showExerciseMenu && filteredSkills.length > 0) {
                          if (e.key === "ArrowDown") { e.preventDefault(); setMenuIndex((i) => Math.min(i + 1, filteredSkills.length - 1)); return; }
                          if (e.key === "ArrowUp") { e.preventDefault(); setMenuIndex((i) => Math.max(i - 1, 0)); return; }
                          if (e.key === "Enter") { e.preventDefault(); handleExerciseMenuSelect(filteredSkills[menuIndex][0]); return; }
                          if (e.key === "Escape") { setShowExerciseMenu(false); setChatInput(""); return; }
                        }
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          handleSendChat();
                        }
                      }}
                      placeholder="Question ou /exercice..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-primary focus:outline-none text-sm"
                    />
                    <button onClick={handleSendChat} className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="col-span-1 lg:col-span-3 bento-card flex flex-col items-center justify-center relative min-h-0 overflow-hidden" onClick={() => inputRef.current?.focus()}>
          {currentExercise && (
            <>
              <div className={`font-extrabold text-slate-900 mb-3 sm:mb-5 text-center tracking-tight select-none whitespace-nowrap ${getQuestionFontClass(currentExercise.question)}`}>{currentExercise.question}</div>

              {activeModes.includes("multiple_choice") ? (
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

                  {/* Hint — desktop only: inside the card, below the numpad */}
                  {showHints && currentExercise.tip && (
                    <div className="hidden lg:block w-full max-w-xs sm:max-w-sm px-4 mt-3">
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-center text-xs text-slate-500">
                        💡 {currentExercise.tip}
                      </div>
                    </div>
                  )}
                </>
              )}

            </>
          )}
        </div>
      </div>

      {/* Hint — mobile only: below the training card */}
      {currentExercise && showHints && currentExercise.tip && (
        <div className="lg:hidden flex-shrink-0 px-2.5 pb-2.5">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-center text-xs text-slate-500">
            💡 {currentExercise.tip}
          </div>
        </div>
      )}
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
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                title="Effacer la conversation"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-xs font-medium"
              >
                Effacer
              </button>
            )}
            <button
              onClick={() => setCoachOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
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
          <div className="relative">
            {showExerciseMenu && filteredSkills.length > 0 && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                {filteredSkills.map(([skill, label], i) => (
                  <button
                    key={skill}
                    onMouseDown={(e) => { e.preventDefault(); handleExerciseMenuSelect(skill); }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                      i === menuIndex ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{SKILL_ICONS[skill]}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setChatInput(val);
                  setShowExerciseMenu(val.startsWith("/"));
                  setMenuIndex(0);
                }}
                onKeyDown={(e) => {
                  if (showExerciseMenu && filteredSkills.length > 0) {
                    if (e.key === "ArrowDown") { e.preventDefault(); setMenuIndex((i) => Math.min(i + 1, filteredSkills.length - 1)); return; }
                    if (e.key === "ArrowUp") { e.preventDefault(); setMenuIndex((i) => Math.max(i - 1, 0)); return; }
                    if (e.key === "Enter") { e.preventDefault(); handleExerciseMenuSelect(filteredSkills[menuIndex][0]); return; }
                    if (e.key === "Escape") { setShowExerciseMenu(false); setChatInput(""); return; }
                  }
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    handleSendChat();
                  }
                }}
                placeholder="Question ou /exercice..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-primary focus:outline-none text-sm"
              />
              <button onClick={handleSendChat} className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

