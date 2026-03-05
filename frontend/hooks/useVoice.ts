"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Language config ───

export type VoiceLang = "fr" | "en";

const LANG_MAP: Record<VoiceLang, { speechLang: string; recognitionLang: string }> = {
  fr: { speechLang: "fr-FR", recognitionLang: "fr-FR" },
  en: { speechLang: "en-US", recognitionLang: "en-US" },
};

// ─── Math expression → spoken text ───

const OPERATOR_WORDS: Record<VoiceLang, Record<string, string>> = {
  fr: { "+": " plus ", "-": " moins ", "−": " moins ", "*": " fois ", "×": " fois ", "/": " divisé par ", "÷": " divisé par ", "=": " égale " },
  en: { "+": " plus ", "-": " minus ", "−": " minus ", "*": " times ", "×": " times ", "/": " divided by ", "÷": " divided by ", "=": " equals " },
};

/** Convert a math expression like "34 + 56" to speakable text */
export function mathToSpeech(expression: string, lang: VoiceLang): string {
  const ops = OPERATOR_WORDS[lang];
  let text = expression;
  // Replace operators with words
  for (const [op, word] of Object.entries(ops)) {
    text = text.split(op).join(word);
  }
  // Clean up extra spaces
  text = text.replace(/\s+/g, " ").trim();

  // For French, add "Combien font" prefix; for English "What is"
  if (lang === "fr") {
    return `Combien font ${text} ?`;
  }
  return `What is ${text}?`;
}

// ─── Spoken number parsing ───

const FR_NUMBERS: Record<string, number> = {
  zéro: 0, un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7,
  huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14,
  quinze: 15, seize: 16, "dix-sept": 17, "dix-huit": 18, "dix-neuf": 19,
  vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  "soixante-dix": 70, "quatre-vingt": 80, "quatre-vingts": 80,
  "quatre-vingt-dix": 90, cent: 100, mille: 1000, million: 1000000,
};

const EN_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000, million: 1000000,
};

/** Parse a spoken transcript into a numeric string answer */
export function parseSpokenNumber(transcript: string, lang: VoiceLang): string | null {
  const cleaned = transcript.toLowerCase().trim();

  // First: try direct numeric extraction (speech-to-text often outputs digits)
  const directDigits = cleaned.replace(/[^0-9\-.,]/g, "").replace(",", ".");
  if (directDigits && /^-?\d+(\.\d+)?$/.test(directDigits)) {
    return directDigits;
  }

  // Check for negative
  const isNegative = /^(moins|negative|minus|négatif)/.test(cleaned);
  const withoutNeg = cleaned.replace(/^(moins|negative|minus|négatif)\s*/, "");

  const numberMap = lang === "fr" ? FR_NUMBERS : EN_NUMBERS;

  // Try to parse word-based numbers
  let result = 0;
  let current = 0;
  const words = withoutNeg.split(/[\s-]+/);

  let matched = false;

  for (const word of words) {
    if (numberMap[word] !== undefined) {
      const val = numberMap[word];
      matched = true;

      if (val === 1000000) {
        current = current === 0 ? 1 : current;
        result += current * 1000000;
        current = 0;
      } else if (val === 1000) {
        current = current === 0 ? 1 : current;
        result += current * 1000;
        current = 0;
      } else if (val === 100) {
        current = current === 0 ? 1 : current;
        current *= 100;
      } else {
        current += val;
      }
    }
  }

  if (!matched) return null;

  result += current;
  if (isNegative) result = -result;

  return String(result);
}

// ─── Hook ───

interface UseVoiceOptions {
  lang: VoiceLang;
  onResult?: (answer: string) => void;
  autoListen?: boolean;
}

interface UseVoiceReturn {
  /** Speak text aloud */
  speak: (text: string) => Promise<void>;
  /** Speak a math expression (auto-converts to words) */
  speakMath: (expression: string) => Promise<void>;
  /** Start listening for speech input */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Whether TTS is currently speaking */
  isSpeaking: boolean;
  /** Whether STT is currently listening */
  isListening: boolean;
  /** Last recognized transcript (raw) */
  transcript: string;
  /** Last parsed answer */
  lastAnswer: string | null;
  /** Whether the browser supports Web Speech API */
  isSupported: boolean;
  /** Error message if any */
  error: string | null;
}

export function useVoice({ lang, onResult, autoListen }: UseVoiceOptions): UseVoiceReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const langRef = useRef(lang);
  langRef.current = lang;

  // Check browser support
  const isSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ─── TTS ───

  const speak = useCallback(
    (text: string) => {
      return new Promise<void>((resolve) => {
        if (!isSupported) {
          resolve();
          return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const { speechLang } = LANG_MAP[langRef.current];
        utterance.lang = speechLang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to find a matching voice
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find((v) => v.lang.startsWith(speechLang.split("-")[0]));
        if (matchingVoice) utterance.voice = matchingVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [isSupported]
  );

  const speakMath = useCallback(
    (expression: string) => {
      const text = mathToSpeech(expression, langRef.current);
      return speak(text);
    },
    [speak]
  );

  // ─── STT ───

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    // Stop existing recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    const { recognitionLang } = LANG_MAP[langRef.current];
    recognition.lang = recognitionLang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const results = event.results;
      const last = results[results.length - 1];

      if (last.isFinal) {
        const raw = last[0].transcript;
        setTranscript(raw);

        // Try all alternatives for best number parse
        let parsed: string | null = null;
        for (let i = 0; i < last.length; i++) {
          const alt = last[i].transcript;
          parsed = parseSpokenNumber(alt, langRef.current);
          if (parsed !== null) break;
        }

        if (parsed !== null) {
          setLastAnswer(parsed);
          onResultRef.current?.(parsed);
        } else {
          // Fallback: just pass raw transcript to see if it's a number
          const trimmed = raw.trim();
          if (/^-?\d+$/.test(trimmed)) {
            setLastAnswer(trimmed);
            onResultRef.current?.(trimmed);
          }
        }
      } else {
        // Interim result
        setTranscript(last[0].transcript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Speech error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Preload voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  return {
    speak,
    speakMath,
    startListening,
    stopListening,
    isSpeaking,
    isListening,
    transcript,
    lastAnswer,
    isSupported,
    error,
  };
}
