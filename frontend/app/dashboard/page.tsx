"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, signOut } from "@/lib/supabase";
import { api, DashboardData, SkillScore } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import PaywallPopup from "@/components/PaywallPopup";
import {
  LogOut, Zap, Target,
  Brain, Timer, Trophy,
  AlertTriangle, Clock, BookOpen, TrendingUp,
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

function getLevelLabel(level: number, t: (k: string) => string): string {
  if (level >= 90) return t("dash_level_expert");
  if (level >= 75) return t("dash_level_advanced");
  if (level >= 55) return t("dash_level_intermediate");
  if (level >= 30) return t("dash_level_beginner_plus");
  if (level >= 10) return t("dash_level_beginner");
  return t("dash_level_new");
}

function formatTimeMs(ms: number | null | undefined, t: (k: string) => string): string {
  if (!ms || isNaN(ms)) return "–";
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return t("dash_less_1min");
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatAvgTime(ms: number | null | undefined): string {
  if (!ms || isNaN(ms)) return "–";
  const seconds = ms / 1000;
  if (seconds < 1) return "–";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.round(seconds / 60)}min`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const currentUser = await getUser();
        if (!currentUser) { router.push("/auth"); return; }
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
          <span className="text-slate-500 font-medium">{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bento-card p-8 max-w-md text-center">
          <div className="text-4xl mb-4">😔</div>
          <h2 className="text-xl font-bold mb-2">{t("error")}</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">{t("retry")}</button>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const d = dashboard;
  const levelLabel = getLevelLabel(d.global_level || 0, t);

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
      {/* Paywall Popup */}
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
      {/* ──── Row 1: Welcome + Level ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bento-card p-5 sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 font-medium mb-1">{t("dash_welcome")}</p>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{t("dash_hello")}</h1>
              <p className="text-slate-500">{user?.email}</p>
            </div>
            <button onClick={async () => { await signOut(); router.push("/"); }}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all" title={t("dash_logout")}>
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
            {Math.round(d.global_level || 0)}
          </div>
          <p className="text-blue-100 text-sm font-medium">/100 · {levelLabel}</p>
        </div>
      </div>

      {/* ──── Row 2: Quick Stats ──── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Zap className="w-5 h-5" />} label={t("dash_calcs_done")} value={String(d.total_exercises || 0)} color="bg-blue-50 text-blue-600" />
        <StatCard icon={<Clock className="w-5 h-5" />} label={t("dash_avg_time")} value={formatAvgTime(d.avg_time_ms)} color="bg-green-50 text-green-600" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label={t("dash_streak")} value={`${streak} ${t("dash_streak_suffix")}`} color="bg-orange-50 text-orange-600" />
        <StatCard icon={<Timer className="w-5 h-5" />} label={t("dash_total_time")} value={formatTimeMs(d.total_time_ms, t)} color="bg-purple-50 text-purple-600" />
      </div>

      {/* ──── Row 3: Skills Grid (full width) ──── */}
      <div className="bento-card p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          {t("dash_skills")}
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
            <AlertTriangle className="w-4 h-4 text-orange-500" /> {t("dash_to_work")}
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
        <ModeCard title={t("dash_free_mode")} desc={t("dash_free_desc")} icon={<Brain className="w-6 h-6" />}
          color="from-slate-900 to-slate-800" onClick={() => { api.setTrainingMode("free").catch(() => {}); router.push("/train?mode=free"); }} />
        <ModeCard title={t("dash_tables_mode")} desc={t("dash_tables_desc")} icon={<Target className="w-6 h-6" />}
          color="from-amber-500 to-orange-500" onClick={() => { api.setTrainingMode("tables").catch(() => {}); router.push("/train?mode=tables"); }} />
        <ModeCard title={t("dash_speed_mode")} desc={t("dash_speed_desc")} icon={<Timer className="w-6 h-6" />}
          color="from-violet-600 to-purple-600" onClick={() => { api.setTrainingMode("speed").catch(() => {}); router.push("/train?mode=speed"); }} />
        <ModeCard title={t("dash_techniques_mode")} desc={t("dash_techniques_desc")} icon={<BookOpen className="w-6 h-6" />}
          color="from-emerald-600 to-teal-600" onClick={() => router.push("/techniques")} />
      </div>
    </div>
  );
}

/* ═══════════ Sub-components ═══════════ */

function SkillBar({ skill }: { skill: SkillScore }) {
  const barColor = SKILL_COLORS[skill.name] || "bg-slate-400";
  const pct = Math.min(skill.score || 0, 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 sm:w-[130px] text-xs font-medium text-slate-700 truncate flex items-center gap-1.5">
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
    <div className="bento-card p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{value}</div>
        <div className="text-xs text-slate-400 font-medium truncate">{label}</div>
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
