"use client";

import Link from "next/link";
import { Brain, Target, Timer, Trophy } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold">
          🧮 MathCoach
        </div>
        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm hover:text-primary transition"
          >
            Se connecter
          </Link>
          <Link
            href="/auth/signup"
            className="px-6 py-2 bg-gradient-to-r from-primary to-secondary rounded-lg font-semibold hover:shadow-xl transition"
          >
            Commencer
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto text-center px-4 py-20">
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
          Maîtrisez le calcul mental
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0A6DFF] to-[#FF7B00]">
            pour vos concours
          </span>
        </h1>
        
        <p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-12">
          Coach IA adaptatif • Progression personnalisée • Feedback instantané
        </p>

        <Link
          href="/auth/signup"
          className="inline-block px-8 py-4 bg-gradient-to-r from-primary to-secondary rounded-xl text-lg font-semibold hover:shadow-2xl transform hover:scale-105 transition"
        >
          Commencer gratuitement
        </Link>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Un seul parcours, entièrement piloté par votre coach IA
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Brain className="w-12 h-12 text-white" />}
            title="Diagnostic automatique"
            description="Évaluation initiale de votre niveau pour adapter l'entraînement"
            gradient="from-blue-600 to-blue-700"
          />
          
          <FeatureCard
            icon={<Target className="w-12 h-12 text-white" />}
            title="Adaptation temps réel"
            description="L'IA ajuste la difficulté selon vos performances"
            gradient="from-purple-600 to-pink-600"
          />
          
          <FeatureCard
            icon={<Timer className="w-12 h-12 text-white" />}
            title="Feedback instantané"
            description="Tips personnalisés et encouragements du coach"
            gradient="from-green-500 to-green-600"
          />
          
          <FeatureCard
            icon={<Trophy className="w-12 h-12 text-white" />}
            title="Suivi progression"
            description="Statistiques détaillées de vos forces et faiblesses"
            gradient="from-orange-600 to-red-600"
          />
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-8">Comment ça marche</h2>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
          <Step number="1" title="Diagnostic" description="Évaluation rapide de votre niveau" />
          <Arrow />
          <Step number="2" title="Entraînement" description="Exercices adaptés par l'IA" />
          <Arrow />
          <Step number="3" title="Progression" description="Suivi et amélioration continue" />
        </div>

        <Link
          href="/auth/signup"
          className="inline-block px-8 py-4 bg-gradient-to-r from-primary to-secondary rounded-xl text-lg font-semibold hover:shadow-2xl transform hover:scale-105 transition"
        >
          Démarrer maintenant
        </Link>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-8 mt-20 border-t border-gray-700 text-center text-gray-400">
        <p>© 2026 MathCoach by PilotBoost • Entraînement adaptatif au calcul mental</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  gradient
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:shadow-2xl transform hover:scale-105 transition">
      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-300 text-sm">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold mb-3">
        {number}
      </div>
      <h4 className="text-lg font-bold mb-1">{title}</h4>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden md:block text-4xl text-gray-500">→</div>
  );
}
