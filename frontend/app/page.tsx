"use client";

import Link from "next/link";
import { Brain, Target, Timer, Trophy, ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Hero Section - Bento Style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Main Hero Card */}
        <div className="lg:col-span-2 bento-card p-10 lg:p-14 flex flex-col justify-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6 w-fit">
            <Sparkles className="w-4 h-4" />
            Coach IA adaptatif
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-4 leading-[1.1]">
            Maîtrisez le
            <br />
            <span className="text-primary">calcul mental</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-lg mb-8 leading-relaxed">
            Entraînement personnalisé par intelligence artificielle.
            Progression adaptée à votre niveau en temps réel.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/signup" className="btn-gradient inline-flex items-center gap-2">
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="px-6 py-3 rounded-2xl text-slate-600 font-medium hover:bg-white/80 transition-all border border-slate-200"
            >
              Se connecter
            </Link>
          </div>
        </div>

        {/* Side stat cards */}
        <div className="flex flex-col gap-4">
          <div className="bento-card p-6 flex-1 flex flex-col justify-center items-center text-center animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="text-5xl font-extrabold text-primary mb-2">IA</div>
            <p className="text-sm text-slate-500">Coach intelligent qui s'adapte à vous</p>
          </div>
          <div className="bento-card p-6 flex-1 flex flex-col justify-center items-center text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="text-5xl font-extrabold text-secondary mb-2">5</div>
            <p className="text-sm text-slate-500">Niveaux de progression</p>
          </div>
          <div className="bento-card p-6 flex-1 flex flex-col justify-center items-center text-center bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="text-5xl font-extrabold text-white mb-2">∞</div>
            <p className="text-sm text-slate-400">Exercices générés</p>
          </div>
        </div>
      </div>

      {/* Features Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <FeatureCard
          icon={<Brain className="w-6 h-6" />}
          title="Diagnostic auto"
          description="Évaluation initiale de votre niveau pour adapter l'entraînement"
          color="bg-blue-50 text-blue-600"
          delay="0.1s"
        />
        <FeatureCard
          icon={<Target className="w-6 h-6" />}
          title="Adaptation"
          description="L'IA ajuste la difficulté selon vos performances en temps réel"
          color="bg-purple-50 text-purple-600"
          delay="0.2s"
        />
        <FeatureCard
          icon={<Timer className="w-6 h-6" />}
          title="Feedback instant"
          description="Tips personnalisés et encouragements de votre coach IA"
          color="bg-green-50 text-green-600"
          delay="0.3s"
        />
        <FeatureCard
          icon={<Trophy className="w-6 h-6" />}
          title="Progression"
          description="Statistiques détaillées de vos forces et faiblesses"
          color="bg-orange-50 text-orange-600"
          delay="0.4s"
        />
      </div>

      {/* How it works - Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <StepCard number="01" title="Diagnostic" description="10 exercices pour évaluer votre niveau de départ" delay="0.1s" />
        <StepCard number="02" title="Entraînement" description="Exercices adaptés en continu par votre coach IA" delay="0.2s" />
        <StepCard number="03" title="Progression" description="Suivi en temps réel et amélioration continue" delay="0.3s" />
      </div>

      {/* CTA Row */}
      <div className="bento-card p-8 text-center bg-gradient-to-r from-primary to-blue-600 border-0 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
        <h2 className="text-2xl font-bold text-white mb-3">Prêt à progresser ?</h2>
        <p className="text-blue-100 mb-6">Rejoignez MathCoach et commencez votre entraînement dès maintenant.</p>
        <Link
          href="/auth/signup"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
        >
          Démarrer maintenant
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Footer */}
      <footer className="text-center text-slate-400 text-sm py-8">
        © 2026 MathCoach by PilotBoost
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
    <div className="bento-card p-6 animate-fade-in-up" style={{ animationDelay: delay }}>
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  delay,
}: {
  number: string;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div className="bento-card p-8 animate-fade-in-up" style={{ animationDelay: delay }}>
      <div className="text-4xl font-extrabold text-slate-200 mb-3">{number}</div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
