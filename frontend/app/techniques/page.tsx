"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Lightbulb, Calculator, Zap } from "lucide-react";

interface Technique {
  title: string;
  category: string;
  description: string;
  example: string;
  steps: string[];
}

const TECHNIQUES: Technique[] = [
  // ── Addition ──
  {
    title: "Compléments à 10",
    category: "Addition",
    description: "Regrouper les chiffres qui font 10 pour simplifier le calcul.",
    example: "7 + 8 + 3 + 2",
    steps: [
      "Repère les paires qui font 10 : 7+3 = 10, 8+2 = 10",
      "Additionne les groupes : 10 + 10 = 20",
    ],
  },
  {
    title: "Arrondir puis ajuster",
    category: "Addition",
    description: "Arrondir un nombre à la dizaine puis compenser.",
    example: "47 + 38",
    steps: [
      "Arrondir 38 → 40 (on ajoute 2)",
      "47 + 40 = 87",
      "Retirer le surplus : 87 − 2 = 85",
    ],
  },
  {
    title: "Décomposition en dizaines/unités",
    category: "Addition",
    description: "Séparer chaque nombre en dizaines et unités.",
    example: "56 + 37",
    steps: [
      "56 = 50 + 6, 37 = 30 + 7",
      "50 + 30 = 80",
      "6 + 7 = 13",
      "80 + 13 = 93",
    ],
  },

  // ── Soustraction ──
  {
    title: "Compenser pour soustraire",
    category: "Soustraction",
    description: "Arrondir le nombre à retrancher puis ajuster.",
    example: "83 − 29",
    steps: [
      "Arrondir 29 → 30 (on retire 1 de trop)",
      "83 − 30 = 53",
      "Ajouter la compensation : 53 + 1 = 54",
    ],
  },
  {
    title: "Soustraction par étapes",
    category: "Soustraction",
    description: "Soustraire d'abord les dizaines, puis les unités.",
    example: "92 − 47",
    steps: [
      "92 − 40 = 52",
      "52 − 7 = 45",
    ],
  },

  // ── Multiplication ──
  {
    title: "Multiplier par 5",
    category: "Multiplication",
    description: "Multiplier par 10 puis diviser par 2 (ou inversement).",
    example: "36 × 5",
    steps: [
      "36 × 10 = 360",
      "360 ÷ 2 = 180",
    ],
  },
  {
    title: "Multiplier par 11",
    category: "Multiplication",
    description: "Pour un nombre à 2 chiffres : écarter les chiffres et mettre leur somme au milieu.",
    example: "34 × 11",
    steps: [
      "Chiffres : 3 et 4",
      "Somme : 3 + 4 = 7",
      "Résultat : 3_7_4 = 374",
      "Si la somme ≥ 10, on reporte la retenue à gauche",
    ],
  },
  {
    title: "Multiplier par 9",
    category: "Multiplication",
    description: "Multiplier par 10 et soustraire le nombre lui-même.",
    example: "7 × 9",
    steps: [
      "7 × 10 = 70",
      "70 − 7 = 63",
    ],
  },
  {
    title: "Distribution (décomposition)",
    category: "Multiplication",
    description: "Décomposer un facteur pour simplifier le produit.",
    example: "14 × 6",
    steps: [
      "14 = 10 + 4",
      "10 × 6 = 60",
      "4 × 6 = 24",
      "60 + 24 = 84",
    ],
  },
  {
    title: "Carrés proches",
    category: "Multiplication",
    description: "Utiliser (a+b)(a−b) = a² − b² quand les facteurs sont proches.",
    example: "23 × 17",
    steps: [
      "Moyenne des facteurs : (23+17)/2 = 20",
      "Écart : 23 − 20 = 3",
      "20² − 3² = 400 − 9 = 391",
    ],
  },

  // ── Division ──
  {
    title: "Diviser par 5",
    category: "Division",
    description: "Multiplier par 2 puis diviser par 10.",
    example: "135 ÷ 5",
    steps: [
      "135 × 2 = 270",
      "270 ÷ 10 = 27",
    ],
  },
  {
    title: "Division par décomposition",
    category: "Division",
    description: "Décomposer le dividende en parties faciles à diviser.",
    example: "96 ÷ 4",
    steps: [
      "96 = 80 + 16",
      "80 ÷ 4 = 20",
      "16 ÷ 4 = 4",
      "20 + 4 = 24",
    ],
  },

  // ── Carrés ──
  {
    title: "Carré d'un nombre en 5",
    category: "Carrés",
    description: "Pour n5² : multiplier n par (n+1) et ajouter 25.",
    example: "35²",
    steps: [
      "3 × 4 = 12",
      "Ajouter 25 : 1225",
    ],
  },
  {
    title: "Carré d'un nombre proche de 10/100",
    category: "Carrés",
    description: "Utiliser (a ± b)² = a² ± 2ab + b²",
    example: "102²",
    steps: [
      "102 = 100 + 2",
      "100² = 10 000",
      "2 × 100 × 2 = 400",
      "2² = 4",
      "10 000 + 400 + 4 = 10 404",
    ],
  },

  // ── Vitesse ──
  {
    title: "Estimation rapide",
    category: "Vitesse",
    description: "Arrondir tous les nombres pour estimer le résultat avant de calculer précisément.",
    example: "48 × 22 ≈ ?",
    steps: [
      "48 ≈ 50, 22 ≈ 20",
      "50 × 20 = 1 000",
      "Le résultat exact (1 056) est proche de 1 000",
      "Ça permet d'éliminer les réponses aberrantes",
    ],
  },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  Addition: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
  Soustraction: { bg: "bg-cyan-50", text: "text-cyan-700", icon: "text-cyan-500" },
  Multiplication: { bg: "bg-violet-50", text: "text-violet-700", icon: "text-violet-500" },
  Division: { bg: "bg-indigo-50", text: "text-indigo-700", icon: "text-indigo-500" },
  Carrés: { bg: "bg-rose-50", text: "text-rose-700", icon: "text-rose-500" },
  Vitesse: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500" },
};

export default function TechniquesPage() {
  const router = useRouter();

  // Group by category
  const categories = Array.from(new Set(TECHNIQUES.map((t) => t.category)));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-slate-100 transition-all">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            Techniques de calcul mental
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maîtrise ces astuces pour calculer plus vite et plus efficacement
          </p>
        </div>
      </div>

      {/* Technique cards by category */}
      {categories.map((cat) => {
        const colors = CATEGORY_COLORS[cat] || { bg: "bg-slate-50", text: "text-slate-700", icon: "text-slate-500" };
        const techniques = TECHNIQUES.filter((t) => t.category === cat);

        return (
          <div key={cat}>
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Calculator className={`w-5 h-5 ${colors.icon}`} />
              {cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {techniques.map((tech, i) => (
                <div key={i} className="bento-card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">{tech.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colors.bg} ${colors.text}`}>
                      {tech.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{tech.description}</p>

                  {/* Example */}
                  <div className="bg-slate-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Exemple</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-slate-900">{tech.example}</p>
                  </div>

                  {/* Steps */}
                  <div className="space-y-1.5">
                    {tech.steps.map((step, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-primary">{j + 1}</span>
                        </div>
                        <p className="text-xs text-slate-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* CTA */}
      <div className="bento-card p-6 text-center bg-gradient-to-br from-emerald-500 to-teal-600 border-0">
        <Zap className="w-8 h-8 text-white/80 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-white mb-1">Prêt à pratiquer ?</h3>
        <p className="text-emerald-100 text-sm mb-4">Mets ces techniques en application</p>
        <button onClick={() => router.push("/train")}
          className="px-6 py-2.5 bg-white text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all">
          Commencer l'entraînement
        </button>
      </div>
    </div>
  );
}
