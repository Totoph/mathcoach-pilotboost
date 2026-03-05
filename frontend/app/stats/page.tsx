"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Target, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { getUser } from "@/lib/supabase";
import { api } from "@/lib/api";

export default function StatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agentState, setAgentState] = useState<any>(null);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        const state = await api.getAgentState();
        setAgentState(state);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bento-card px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-500 font-medium">Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!agentState) return null;

  const { instance, recent_performance } = agentState;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bento-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Statistiques</h1>
            <p className="text-sm text-slate-400">Vue d'ensemble de votre progression</p>
          </div>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-1">
            {recent_performance.total_exercises}
          </div>
          <p className="text-sm text-slate-400">Exercices réalisés</p>
        </div>

        <div className="bento-card p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
            <Target className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-1">
            {recent_performance.recent_accuracy}%
          </div>
          <p className="text-sm text-slate-400">Précision récente</p>
        </div>

        <div className="bento-card p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-1">
            {instance.current_level}
          </div>
          <p className="text-sm text-slate-400">Niveau actuel</p>
        </div>
      </div>

      {/* Strengths & Weaknesses Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bento-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <h3 className="font-bold text-slate-900">Points forts</h3>
          </div>
          {instance.state.strengths.length > 0 ? (
            <div className="space-y-3">
              {instance.state.strengths.map((s: string) => (
                <div key={s} className="flex items-center gap-3 p-3 bg-green-50/50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 capitalize">{s}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-3xl mb-2">🏋️</div>
              <p className="text-sm text-slate-400">Continue pour identifier tes forces !</p>
            </div>
          )}
        </div>

        <div className="bento-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <h3 className="font-bold text-slate-900">À travailler</h3>
          </div>
          {instance.state.weaknesses.length > 0 ? (
            <div className="space-y-3">
              {instance.state.weaknesses.map((w: string) => (
                <div key={w} className="flex items-center gap-3 p-3 bg-orange-50/50 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 capitalize">{w}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm text-slate-400">Aucune faiblesse détectée !</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/train"
        className="bento-card p-6 flex items-center justify-center text-center bg-gradient-to-r from-primary to-blue-600 border-0 group"
      >
        <span className="text-white font-semibold text-lg">Continuer l'entraînement →</span>
      </Link>
    </div>
  );
}
