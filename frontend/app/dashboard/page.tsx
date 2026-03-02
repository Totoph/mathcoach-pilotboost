"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, signOut } from "@/lib/supabase";
import { api } from "@/lib/api";
import { BarChart3, LogOut, User } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agentState, setAgentState] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const currentUser = await getUser();
        if (!currentUser) {
          router.push("/auth/login");
          return;
        }
        setUser(currentUser);

        // Initialiser l'agent
        const state = await api.initAgent();
        setAgentState(state);
      } catch (err: any) {
        console.error("Dashboard init error:", err);
        setError(err.message || "Une erreur s'est produite");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="max-w-md bg-red-500/20 border border-red-500 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-2">❌ Erreur</h2>
          <p className="text-gray-200 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600 transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!agentState) {
    return null;
  }

  const { instance, recent_performance } = agentState;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center border-b border-white/10">
        <div className="text-2xl font-bold">🧮 MathCoach</div>
        <div className="flex gap-4 items-center">
          <Link
            href="/stats"
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Statistiques"
          >
            <BarChart3 className="w-5 h-5" />
          </Link>
          <Link
            href="/profile"
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Profil"
          >
            <User className="w-5 h-5" />
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Déconnexion"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">
          Bonjour 👋
        </h1>
        <p className="text-gray-400 mb-8">{user?.email}</p>

        {/* Stats Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl">
              🤖
            </div>
            <div>
              <h2 className="text-xl font-bold">Votre coach IA</h2>
              <p className="text-sm text-gray-400">
                Niveau : {instance.current_level === 0 ? "Diagnostic initial" : `Niveau ${instance.current_level}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{recent_performance.total_exercises}</div>
              <div className="text-sm text-gray-400">Exercices</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{recent_performance.recent_accuracy}%</div>
              <div className="text-sm text-gray-400">Précision</div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-2xl font-bold text-secondary">
                {instance.diagnostic_completed ? "✅" : "⏳"}
              </div>
              <div className="text-sm text-gray-400">Diagnostic</div>
            </div>
          </div>
        </div>

        {/* Coach Message */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm rounded-2xl p-6 border border-primary/30 mb-8">
          <div className="flex items-start gap-3">
            <div className="text-3xl">💬</div>
            <div>
              <h3 className="font-bold mb-1">Message de votre coach :</h3>
              <p className="text-gray-200">
                {instance.state.total_exercises === 0
                  ? "Bienvenue ! Prêt·e à commencer ton entraînement ? Lance ton premier exercice ! 🎯"
                  : `Tu progresses bien ! Continue comme ça. ${
                      instance.state.weaknesses.length > 0
                        ? `On va travailler ensemble sur : ${instance.state.weaknesses.join(", ")}.`
                        : "Tu maîtrises de mieux en mieux !"
                    }`}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/train"
          className="block w-full py-6 bg-gradient-to-r from-primary to-secondary rounded-2xl text-center text-xl font-bold hover:shadow-2xl transform hover:scale-105 transition"
        >
          {instance.state.total_exercises === 0
            ? "🚀 Commencer l'entraînement"
            : "🔥 Continuer l'entraînement"}
        </Link>

        {/* Progress */}
        {recent_performance.total_exercises > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Progression récente</h2>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Points forts</h3>
                  {instance.state.strengths.length > 0 ? (
                    <ul className="space-y-1">
                      {instance.state.strengths.map((s: string) => (
                        <li key={s} className="text-green-400 flex items-center gap-2">
                          <span className="text-lg">✅</span> {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">En cours d'évaluation...</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">À travailler</h3>
                  {instance.state.weaknesses.length > 0 ? (
                    <ul className="space-y-1">
                      {instance.state.weaknesses.map((w: string) => (
                        <li key={w} className="text-orange-400 flex items-center gap-2">
                          <span className="text-lg">⚠️</span> {w}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">Aucune faiblesse détectée ! 🎉</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
