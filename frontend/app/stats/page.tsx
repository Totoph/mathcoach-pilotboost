"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!agentState) return null;

  const { instance, recent_performance } = agentState;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Dashboard
        </Link>

        <h1 className="text-4xl font-bold mb-8">Vos statistiques 📊</h1>

        {/* Overall Stats */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
          <h2 className="text-2xl font-bold mb-4">Vue d'ensemble</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">
                {recent_performance.total_exercises}
              </div>
              <div className="text-sm text-gray-400">Exercices réalisés</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">
                {recent_performance.recent_accuracy}%
              </div>
              <div className="text-sm text-gray-400">Précision récente</div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-4xl font-bold text-secondary mb-2">
                {instance.current_level}
              </div>
              <div className="text-sm text-gray-400">Niveau actuel</div>
            </div>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold mb-4 text-green-400">Points forts ✅</h3>
            {instance.state.strengths.length > 0 ? (
              <ul className="space-y-2">
                {instance.state.strengths.map((s: string) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <span className="capitalize">{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">Continue pour identifier tes forces !</p>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold mb-4 text-orange-400">À travailler ⚠️</h3>
            {instance.state.weaknesses.length > 0 ? (
              <ul className="space-y-2">
                {instance.state.weaknesses.map((w: string) => (
                  <li key={w} className="flex items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    <span className="capitalize">{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">Aucune faiblesse détectée ! 🎉</p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/train"
            className="inline-block px-8 py-4 bg-gradient-to-r from-primary to-secondary rounded-xl text-lg font-semibold hover:shadow-2xl transform hover:scale-105 transition"
          >
            Continuer l'entraînement
          </Link>
        </div>
      </div>
    </div>
  );
}
