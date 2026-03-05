"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Target, Timer, Trophy, ArrowRight, Sparkles } from "lucide-react";
import { getUser } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    getUser().then((u) => setLoggedIn(!!u)).catch(() => setLoggedIn(false));
  }, []);

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col gap-3">
      {/* Hero Section - Bento Style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Main Hero Card */}
        <div className="lg:col-span-2 bento-card p-8 lg:p-10 flex flex-col justify-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3.5 py-1 text-sm font-medium mb-4 w-fit">
            <Sparkles className="w-4 h-4" />
            {t("home_badge")}
          </div>
          <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-3 leading-[1.1]">
            {t("home_title_1")}
            <br />
            <span className="text-primary">{t("home_title_2")}</span>
          </h1>
          <p className="text-base text-slate-500 max-w-lg mb-6 leading-relaxed">
            {t("home_desc")}
          </p>
          <div className="flex flex-wrap gap-3">
            {loggedIn ? (
              <Link href="/train" className="btn-gradient inline-flex items-center gap-2">
                {t("home_train")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : loggedIn === false ? (
              <>
                <Link href="/auth" className="btn-gradient inline-flex items-center gap-2">
                  {t("home_start_free")}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/auth"
                  className="px-6 py-3 rounded-2xl text-slate-600 font-medium hover:bg-white/80 transition-all border border-slate-200"
                >
                  {t("home_login")}
                </Link>
              </>
            ) : null}
          </div>
        </div>

        {/* Side stat cards */}
        <div className="flex flex-col gap-3">
          <div className="bento-card p-4 flex-1 flex flex-col justify-center items-center text-center animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="text-4xl font-extrabold text-primary mb-1">{t("home_ai_label")}</div>
            <p className="text-xs text-slate-500">{t("home_ai_desc")}</p>
          </div>
          <div className="bento-card p-4 flex-1 flex flex-col justify-center items-center text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="text-4xl font-extrabold text-secondary mb-1">{t("home_levels")}</div>
            <p className="text-xs text-slate-500">{t("home_levels_desc")}</p>
          </div>
          <div className="bento-card p-4 flex-1 flex flex-col justify-center items-center text-center bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="text-4xl font-extrabold text-white mb-1">{t("home_exercises")}</div>
            <p className="text-xs text-slate-400">{t("home_exercises_desc")}</p>
          </div>
        </div>
      </div>

      {/* Features Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <FeatureCard
          icon={<Brain className="w-5 h-5" />}
          title={t("home_feature_diag")}
          description={t("home_feature_diag_desc")}
          color="bg-blue-50 text-blue-600"
          delay="0.1s"
        />
        <FeatureCard
          icon={<Target className="w-5 h-5" />}
          title={t("home_feature_adapt")}
          description={t("home_feature_adapt_desc")}
          color="bg-purple-50 text-purple-600"
          delay="0.2s"
        />
        <FeatureCard
          icon={<Timer className="w-5 h-5" />}
          title={t("home_feature_feedback")}
          description={t("home_feature_feedback_desc")}
          color="bg-green-50 text-green-600"
          delay="0.3s"
        />
        <FeatureCard
          icon={<Trophy className="w-5 h-5" />}
          title={t("home_feature_progress")}
          description={t("home_feature_progress_desc")}
          color="bg-orange-50 text-orange-600"
          delay="0.4s"
        />
      </div>

      {/* CTA Row */}
      <div className="bento-card p-5 text-center bg-gradient-to-r from-primary to-blue-600 border-0 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
        <h2 className="text-xl font-bold text-white mb-2">{t("home_cta_title")}</h2>
        <p className="text-blue-100 text-sm mb-4">{t("home_cta_desc")}</p>
        <Link
          href={loggedIn ? "/train" : "/auth"}
          className="inline-flex items-center gap-2 px-7 py-3 bg-white text-primary rounded-2xl font-semibold text-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
        >
          {loggedIn ? t("home_train") : t("home_cta_btn")}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Footer */}
      <footer className="text-center text-slate-400 text-xs py-2">
        {t("home_footer")}
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  delay: string;
}) {
  return (
    <div className="bento-card p-4 animate-fade-in-up" style={{ animationDelay: delay }}>
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-2.5`}>
        {icon}
      </div>
      <h3 className="text-sm font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
