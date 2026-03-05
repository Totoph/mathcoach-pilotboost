"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User2, Target, Settings, LogOut } from "lucide-react";
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

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="bento-card p-6 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profil</h1>
          <p className="text-sm text-slate-400">Gérez votre compte</p>
        </div>
      </div>

      {/* User Avatar + Info */}
      <div className="bento-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <User2 className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="font-bold text-slate-900">Informations</h2>
        </div>
        <div className="space-y-4">
          <div className="p-3 bg-slate-50/80 rounded-xl">
            <label className="text-xs text-slate-400 font-medium">Email</label>
            <div className="text-sm font-medium text-slate-900 mt-0.5">{user?.email}</div>
          </div>
          <div className="p-3 bg-slate-50/80 rounded-xl">
            <label className="text-xs text-slate-400 font-medium">ID Utilisateur</label>
            <div className="text-xs font-mono text-slate-500 mt-0.5">{user?.id}</div>
          </div>
          <div className="p-3 bg-slate-50/80 rounded-xl">
            <label className="text-xs text-slate-400 font-medium">Compte créé le</label>
            <div className="text-sm text-slate-700 mt-0.5">
              {new Date(user?.created_at).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Objective */}
      <div className="bento-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <Target className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="font-bold text-slate-900">Objectif</h2>
        </div>
        <p className="text-sm text-slate-400 mb-3">
          Sélectionnez votre objectif de concours (à venir)
        </p>
        <select
          disabled
          className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-100 rounded-xl text-sm text-slate-500 cursor-not-allowed"
        >
          <option>Concours pilote ENAC</option>
          <option>Consulting (BCG, McKinsey...)</option>
          <option>Finance (trading)</option>
          <option>Autre</option>
        </select>
      </div>

      {/* Preferences */}
      <div className="bento-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <Settings className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="font-bold text-slate-900">Préférences</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl">
            <span className="text-sm text-slate-600">Activer le son</span>
            <div className="w-10 h-6 bg-slate-200 rounded-full cursor-not-allowed opacity-50" />
          </div>
          <div className="p-3 bg-slate-50/80 rounded-xl">
            <label className="block text-sm text-slate-600 mb-2">Temps par question</label>
            <select
              disabled
              className="w-full px-3 py-2 bg-white border border-slate-100 rounded-lg text-sm cursor-not-allowed"
            >
              <option>30 secondes</option>
              <option>60 secondes</option>
              <option>Illimité</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="bento-card p-4 w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50/50 hover:border-red-200 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span className="font-semibold text-sm">Déconnexion</span>
      </button>
    </div>
  );
}
