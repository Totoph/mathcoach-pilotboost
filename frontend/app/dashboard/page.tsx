"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, signOut } from "@/lib/supabase";
import { api, DashboardData, SkillScore, DailyTimeEntry } from "@/lib/api";
import {
  LogOut, Zap, Target,
  Brain, Timer, Trophy,
  AlertTriangle, BarChart3, Clock, BookOpen, TrendingUp,
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

type Period = "day" | "week" | "month";

function filterTimeData(data: DailyTimeEntry[], period: Period): DailyTimeEntry[] {
  const now = new Date();
  const days = period === "month" ? 30 : period === "week" ? 7 : 1;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return data.filter((d) => d.date >= cutoffStr);
}

function formatTimeMs(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatAvgTime(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 1) return "–";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.round(seconds / 60)}min`;
}

/** Simple SVG bar chart for daily time */
function BarChart({
  data,
  color = "#6366f1",
  height = 90,
}: {
  data: { x: number; y: number; label: string }[];
  color?: string;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-slate-400">
        Pas de données
      </div>
    );
  }
  const width = 400;
  const pad = 6;
  const maxY = Math.max(...data.map((d) => d.y), 1);
  const barWidth = Math.max(4, (width - 2 * pad) / data.length - 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const barH = (d.y / maxY) * (height - 2 * pad);
        const x = pad + i * ((width - 2 * pad) / data.length) + 1;
        const y = height - pad - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={2}
              fill={color}
              opacity={0.8}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week");

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

  // Filter daily time data by period
  const filteredTime = filterTimeData(d.daily_time_data || [], period);
  const totalTimeInPeriod = filteredTime.reduce((s, e) => s + e.time_ms, 0);
  const totalExInPeriod = filteredTime.reduce((s, e) => s + e.exercises, 0);

  // Bar chart data
  const chartData = filteredTime.map((e, i) => ({
    x: i,
    y: Math.round(e.time_ms / 60000), // minutes
    label: e.date.slice(5),
  }));

  const PERIODS: { key: Period; label: string }[] = [
    { key: "day", label: "Jour" },
    { key: "week", label: "Semaine" },
    { key: "month", label: "Mois" },
  ];

  // Streak: consecutive days with exercises (from today backwards)
  const allDates = new Set((d.daily_time_data || []).map((e) => e.date));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    if (allDates.has(date)) streak++;
    else if (i > 0) break;
  }

  return (
    <div className="space-y-4">
      {/* ──── Row 1: Welcome + Level ──── */}
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

        {/* Level card — clean, no diagnostic bar */}
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
        </div>
      </div>

      {/* ──── Row 2: Quick Stats ──── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Zap className="w-5 h-5" />} label="Exercices" value={String(d.total_exercises)} color="bg-blue-50 text-blue-600" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Temps moyen" value={formatAvgTime(d.avg_time_ms)} color="bg-green-50 text-green-600" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Série en cours" value={`${streak} j`} color="bg-orange-50 text-orange-600" />
        <StatCard icon={<Timer className="w-5 h-5" />} label="Temps total" value={formatTimeMs(d.total_time_ms)} color="bg-purple-50 text-purple-600" />
      </div>

      {/* ──── Row 3: Temps passé chart ──── */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Temps passé
          </h3>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {PERIODS.map(({ key, label }) => (
              <button key={key} onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredTime.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            Aucune donnée pour cette période
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <span className="text-2xl font-bold text-slate-900">{formatTimeMs(totalTimeInPeriod)}</span>
                <span className="text-xs text-slate-400 ml-2">total</span>
              </div>
              <div>
                <span className="text-lg font-bold text-slate-700">{totalExInPeriod}</span>
                <span className="text-xs text-slate-400 ml-1">exercices</span>
              </div>
            </div>
            <BarChart data={chartData} color="#6366f1" height={90} />
            {filteredTime.length > 1 && (
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                <span>{filteredTime[0]?.date?.slice(5)}</span>
                <span>{filteredTime[filteredTime.length - 1]?.date?.slice(5)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ──── Row 4: Skills Grid (full width) ──── */}
      <div className="bento-card p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Compétences
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {d.skills.map((skill) => (
            <SkillBar key={skill.name} skill={skill} />
          ))}
        </div>
      </div>

      {/* ──── Row 5: Weaknesses (only if data) ──── */}
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

      {/* ──── Row 6: Training Mode Selector ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModeCard title="Entraînement libre" desc="L'agent choisit" icon={<Brain className="w-6 h-6" />}
          color="from-slate-900 to-slate-800" onClick={() => { api.setTrainingMode("free").catch(() => {}); router.push("/train?mode=free"); }} />
        <ModeCard title="Tables 1-20" desc="Drill les tables" icon={<Target className="w-6 h-6" />}
          color="from-amber-500 to-orange-500" onClick={() => { api.setTrainingMode("tables").catch(() => {}); router.push("/train?mode=tables"); }} />
        <ModeCard title="Mode Vitesse" desc="QCM rapide" icon={<Timer className="w-6 h-6" />}
          color="from-violet-600 to-purple-600" onClick={() => { api.setTrainingMode("speed").catch(() => {}); router.push("/train?mode=speed"); }} />
        <ModeCard title="Techniques" desc="Astuces de calcul" icon={<BookOpen className="w-6 h-6" />}
          color="from-emerald-600 to-teal-600" onClick={() => router.push("/techniques")} />
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
