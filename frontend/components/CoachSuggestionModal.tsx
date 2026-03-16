"use client";

import { Brain, ArrowRight, X } from "lucide-react";

interface CoachSuggestionModalProps {
  isOpen: boolean;
  masteredSkillLabel: string;
  masteredSkillScore: number;
  weakness: { name: string; label: string; score: number };
  onContinue: () => void;
  onSwitchToWeakness: () => void;
}

export default function CoachSuggestionModal({
  isOpen,
  masteredSkillLabel,
  masteredSkillScore,
  weakness,
  onContinue,
  onSwitchToWeakness,
}: CoachSuggestionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onContinue} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-5 text-center relative">
          <button
            onClick={onContinue}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">Conseil du coach</h2>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed text-center">
            Tu maîtrises bien les{" "}
            <span className="font-bold text-indigo-600">{masteredSkillLabel}</span>{" "}
            ({masteredSkillScore}/100) ! 🎉
            <br />
            <br />
            Ton point faible en ce moment :{" "}
            <span className="font-bold text-rose-600">{weakness.label}</span>{" "}
            ({weakness.score}/100).
            <br />
            C&apos;est le bon moment pour progresser là-dessus !
          </p>

          <button
            onClick={onSwitchToWeakness}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            Travailler sur {weakness.label}
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onContinue}
            className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-medium text-sm transition-all"
          >
            Continuer les {masteredSkillLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
