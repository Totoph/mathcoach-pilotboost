"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUser, signOut } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const currentUser = await getUser();
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }
      setUser(currentUser);
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Dashboard
        </Link>

        <h1 className="text-4xl font-bold mb-8">Profil</h1>

        {/* User Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            👤 Informations
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400">Email</label>
              <div className="text-lg">{user?.email}</div>
            </div>
            <div>
              <label className="text-sm text-gray-400">ID Utilisateur</label>
              <div className="text-sm font-mono text-gray-300">{user?.id}</div>
            </div>
            <div>
              <label className="text-sm text-gray-400">Compte créé le</label>
              <div className="text-sm text-gray-300">
                {new Date(user?.created_at).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Objectives (Future) */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            🎯 Objectif
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Sélectionnez votre objectif de concours (à venir)
          </p>
          <select
            disabled
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-500 cursor-not-allowed"
          >
            <option>Concours pilote ENAC</option>
            <option>Consulting (BCG, McKinsey...)</option>
            <option>Finance (trading)</option>
            <option>Autre</option>
          </select>
        </div>

        {/* Preferences (Future) */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            ⚙️ Préférences
          </h2>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-center gap-3">
              <input type="checkbox" disabled className="cursor-not-allowed" />
              <label>Activer le son (à venir)</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" disabled className="cursor-not-allowed" />
              <label>Mode sombre (à venir)</label>
            </div>
            <div>
              <label className="block mb-2">Temps par question (à venir)</label>
              <select
                disabled
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg cursor-not-allowed"
              >
                <option>30 secondes</option>
                <option>60 secondes</option>
                <option>Illimité</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="border-t border-white/10 pt-6">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
