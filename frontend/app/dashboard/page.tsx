"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, signOut } from "@/lib/supabase";
import { api, DashboardData, SkillScore } from "@/lib/api";
import {
  LogOut, Sparkles, Zap, Target,
  Brain, Timer, Trophy,
  AlertTriangle, CheckCircle2, Flame, BarChart3,
} from "lucide-react";

const SKILL_COLORS: Record<string, string> = {
  addition: "bg-blue-500",
  subtraction: "bg-cyan-500",
  multiplication: "bg-violet-500",
  division: "bg-indigo-500",
  tables_1_20: "bg-amber-500",
  squares: "bg-rose-500",
  decomposition: "bg-emerald-500",
  fast_multiplication: "bg-orange-500",
  estimation: "bg-teal-500",
  mixed: "bg-pink-500",
  chain: "bg-lime-600",
  advanced: "bg-red-600",
};

function getLevelLabel(level: number): string {
  if (level >= 90) return "Expert";
  if (level >= 75) return "Avancé";
  if (level >= 55) return "Intermédiaire";
  if (level >= 30) return "Débutant+";
  if (level >= 10) return "Débutant";
  return "Nouveau";
}

function getLevelColor(level: number): string {
  if (level >= 90) return "text-amber-500";
  if (level >= 75) return "text-violet-500";
  if (level >= 55) return "text-blue-500";
  if (level >= 30) return "text-emerald-500";
  return "text-slate-500";
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [trainingMode, setTrainingMode] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const currentUser = await getUser();
        if (!currentUser) { router.push("/auth/login"); return; }
        setUser(currentUser);
        const data = await api.getDashboard();
        setDashboard(data);
      } catch (err: any) {
        console.error("Dashboard error:", err);
        setError(err.message || "Une erreur s'est produite");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  async function handleSetMode(mode: string) {
    setTrainingMode(mode);
    try { await api.setTrainingMode(mode); } catch {}
    router.push("/train");
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bento-card px-8 py-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 font-medium">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bento-card p-8 max-w-md text-center">
          <div className="text-4xl mb-4">😔</div>
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Réessayer</button>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const d = dashboard;
  const levelLabel = getLevelLabel(d.global_level);
  const levelColor = getLevelColor(d.global_level);

  return (
    <div className="space-y-4">
      {/* ──── Row 1: Welcome + Level Gauge ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bento-card p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 font-medium mb-1">Bienvenue</p>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Bonjour 👋</h1>
              <p className="text-slate-500">{user?.email}</p>
            </div>
            <button onClick={async () => { await signOut(); router.push("/"); }}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all" title="Déconnexion">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Level card */}
        <div className="bento-card p-6 flex flex-col justify-center items-center text-center bg-gradient-to-br from-primary to-blue-600 border-0 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white" />
          </div>
          <Trophy className="w-8 h-8 text-white/80 mb-2" />
          <div className="text-5xl font-extrabold text-white mb-1">
            {Math.round(d.global_level)}
          </div>
          <p className="text-blue-100 text-sm font-medium">/100 · {levelLabel}</p>
          {!d.diagnostic_completed && (
            <div className="mt-3 w-full">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/80 rounded-full transition-all" style={{ width: `${Math.min(d.total_exercises / 10, 1) * 100}%` }} />
                </div>
                <span className="text-xs text-white/70">{d.total_exercises}/10</span>
              </div>
              <p className="text-xs text-blue-100 mt-1">Diagnostic en cours</p>
            </div>
          )}
        </div>
      </div>

      {/* ──── Row 2: Quick Stats ──── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Zap className="w-5 h-5" />} label="Exercices" value={String(d.total_exercises)} color="bg-blue-50 text-blue-600" />
        <StatCard icon={<Target className="w-5 h-5" />} label="Précision" value={`${d.accuracy}%`} color="bg-green-50 text-green-600" />
        <StatCard icon={<Flame className="w-5 h-5" />} label="Réussites" value={String(d.total_correct)} color="bg-orange-50 text-orange-600" />
        <StatCard icon={<Brain className="w-5 h-5" />} label="Compétences" value={`${d.skills.filter(s => s.score > 0).length}/12`} color="bg-purple-50 text-purple-600" />
      </div>

      {/* ──── Row 3: Skills Grid + Agent ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Skills overview */}
        <div className="lg:col-span-2 bento-card p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Compétences (12 dimensions)
          </h3>
          <div className="space-y-3">
            {d.skills.map((skill) => (
              <SkillBar key={skill.name} skill={skill} />
            ))}
          </div>
        </div>

        {/* Agent message + strengths/weaknesses */}
        <div className="space-y-4">
          <div className="bento-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Coach IA</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">{d.agent_message}</p>
          </div>

          {d.strengths.length > 0 && (
            <div className="bento-card p-5">
              <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Points forts
              </h4>
              <div className="flex flex-wrap gap-2">
                {d.strengths.map((s) => (
                  <span key={s} className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {d.weaknesses.length > 0 && (
            <div className="bento-card p-5">
              <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> À travailler
              </h4>
              <div className="flex flex-wrap gap-2">
                {d.weaknesses.map((w) => (
                  <span key={w} className="text-xs px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full font-medium">{w}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──── Row 4: Training Mode Selector + CTA ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModeCard title="Entraînement libre" desc="L'agent choisit" icon={<Brain className="w-6 h-6" />}
          color="from-slate-900 to-slate-800" onClick={() => handleSetMode("free")} />
        <ModeCard title="Tables 1-20" desc="Drill les tables" icon={<Target className="w-6 h-6" />}
          color="from-amber-500 to-orange-500" onClick={() => handleSetMode("tables")} />
        <ModeCard title="Mode Vitesse" desc="Réponse rapide" icon={<Timer className="w-6 h-6" />}
          color="from-violet-600 to-purple-600" onClick={() => handleSetMode("speed")} />
        <ModeCard title="Techniques" desc="Astuces avancées" icon={<Sparkles className="w-6 h-6" />}
          color="from-emerald-600 to-teal-600" onClick={() => handleSetMode("advanced")} />
      </div>

      {/* ──── Row 5: Error Breakdown (if data) ──── */}
      {Object.values(d.error_breakdown).some(v => v > 0) && (
        <div className="bento-card p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Analyse des erreurs
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(d.error_breakdown).filter(([, v]) => v > 0).map(([type, count]) => (
              <div key={type} className="text-center p-3 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-900">{count}</div>
                <div className="text-xs text-slate-500 mt-1">{errorLabel(type)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──── Quick Links ──── */}
      <div className="grid grid-cols-1 gap-4">
        <Link href="/profile" className="bento-card p-5 flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Profil</p>
            <p className="text-xs text-slate-400">Gérer votre compte</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

/* ═══════════ Sub-components ═══════════ */

function SkillBar({ skill }: { skill: SkillScore }) {
  const barColor = SKILL_COLORS[skill.name] || "bg-slate-400";
  const pct = Math.min(skill.score, 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-[130px] text-xs font-medium text-slate-700 truncate flex items-center gap-1.5">
        {skill.label}
        {skill.is_automated && <span title="Automatisé" className="text-green-500">⚡</span>}
        {skill.is_plateau && <span title="Plateau" className="text-orange-500">⏸</span>}
      </div>
      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }} />
      </div>
      <div className="w-12 text-right text-xs font-bold text-slate-600">{Math.round(skill.score)}</div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bento-card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-400 font-medium">{label}</div>
      </div>
    </div>
  );
}

function ModeCard({ title, desc, icon, color, onClick }: {
  title: string; desc: string; icon: React.ReactNode; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`bento-card p-5 flex flex-col items-center text-center bg-gradient-to-br ${color} border-0 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer`}>
      <div className="text-white/80 mb-2">{icon}</div>
      <h4 className="font-bold text-white text-sm">{title}</h4>
      <p className="text-white/60 text-xs mt-1">{desc}</p>
    </button>
  );
}

function errorLabel(type: string): string {
  const labels: Record<string, string> = {
    table_error: "Erreur de table",
    carry_error: "Retenue",
    inattention: "Inattention",
    procedure_error: "Procédure",
    timeout: "Trop lent",
    slow: "Lent",
  };
  return labels[type] || type;
}
