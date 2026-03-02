# Hero Section — MathCoach Landing Page

**Style PilotBoost** — Bento boxes floating avec gradients subtils

---

## Layout Global

```
┌─────────────────────────────────────────────────────────────┐
│                    [Navbar flottante]                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                   🧮 Hero Section                           │
│              (Titre + CTA + Illustration)                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│               📊 Bento Boxes (Features)                     │
│                  (Grid 2 colonnes)                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                  💬 Section Témoignages                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     🚀 CTA Final                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Hero Section (Fold 1)

```tsx
<section className="relative min-h-screen flex items-center justify-center 
                    px-4 pt-24 pb-16 overflow-hidden">
  
  {/* Background gradient */}
  <div className="absolute inset-0 bg-gradient-to-br 
                  from-[#0A6DFF]/5 via-white to-[#FF7B00]/5" />
  
  {/* Content */}
  <div className="relative z-10 max-w-6xl mx-auto text-center">
    
    {/* Badge */}
    <div className="inline-flex items-center gap-2 px-4 py-2 
                    rounded-full bg-white/80 backdrop-blur-md 
                    border border-[#0A6DFF]/20 mb-6
                    shadow-[0_4px_20px_rgba(10,109,255,0.08)]">
      <span className="text-[#0A6DFF] font-semibold text-sm">
        🎯 Prépa concours pilote, consulting, finance
      </span>
    </div>
    
    {/* Titre principal */}
    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6
                   leading-tight">
      Maîtrisez le calcul mental
      <span className="block bg-clip-text text-transparent 
                       bg-gradient-to-r from-[#0A6DFF] to-[#FF7B00]">
        en 30 jours
      </span>
    </h1>
    
    {/* Sous-titre */}
    <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
      Entraînement adaptatif basé sur l'IA. 
      Passez de 60% à 95% de réussite aux tests psychotechniques.
    </p>
    
    {/* CTA Buttons */}
    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
      <button className="px-8 py-4 rounded-xl font-semibold text-white
                       bg-gradient-to-r from-[#0A6DFF] to-[#0A6DFF]/90
                       hover:shadow-[0_8px_30px_rgba(10,109,255,0.3)]
                       transition-all hover:scale-105">
        Commencer l'entraînement →
      </button>
      
      <button className="px-8 py-4 rounded-xl font-semibold
                       text-[#0A6DFF] bg-white border-2 border-[#0A6DFF]/20
                       hover:border-[#0A6DFF]/40 hover:bg-[#0A6DFF]/5
                       transition-all">
        Voir un exemple d'exercice
      </button>
    </div>
    
    {/* Social proof */}
    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-[#0A6DFF]">2,847</span>
        <span>utilisateurs actifs</span>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-[#FF7B00]">94%</span>
        <span>de réussite aux tests</span>
      </div>
    </div>
    
  </div>
  
  {/* Illustration (optionnelle) */}
  <div className="absolute bottom-0 right-0 w-1/3 opacity-20">
    {/* SVG illustration ou image */}
  </div>
  
</section>
```

---

## 2. Bento Boxes — Features (Fold 2)

**Grid 2 colonnes responsive** (4 features principales)

```tsx
<section className="py-20 px-4 bg-gradient-to-b from-white to-[#0A6DFF]/5">
  
  <div className="max-w-6xl mx-auto">
    
    {/* Section header */}
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold mb-4">
        Pourquoi MathCoach ?
      </h2>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Un entraînement scientifique basé sur l'apprentissage adaptatif
      </p>
    </div>
    
    {/* Bento grid */}
    <div className="grid md:grid-cols-2 gap-6">
      
      {/* Card 1 - Diagnostic IA */}
      <div className="bg-card rounded-xl p-6 shadow-sm 
                      border-2 border-transparent hover:border-[#0A6DFF]/20 
                      transition-all hover:shadow-lg">
        
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl 
                          bg-gradient-to-br from-[#0A6DFF]/10 to-[#0A6DFF]/5
                          flex items-center justify-center">
            <span className="text-2xl">🎯</span>
          </div>
          <div>
            <h3 className="font-bold text-xl text-[#0A6DFF] mb-2">
              Diagnostic IA précis
            </h3>
            <p className="text-sm text-muted-foreground">
              20 questions pour évaluer votre niveau exact et identifier vos points faibles
            </p>
          </div>
        </div>
        
        {/* Mini-features */}
        <div className="space-y-2 mt-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600">✓</span>
            <span>Évaluation en 5 minutes</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600">✓</span>
            <span>Plan d'entraînement personnalisé</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600">✓</span>
            <span>Suivi de progression en temps réel</span>
          </div>
        </div>
        
      </div>
      
      {/* Card 2 - Entraînement adaptatif */}
      <div className="bg-card rounded-xl p-6 shadow-sm 
                      border-2 border-transparent hover:border-purple-600/20 
                      transition-all hover:shadow-lg">
        
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl 
                          bg-gradient-to-br from-purple-600/10 to-purple-600/5
                          flex items-center justify-center">
            <span className="text-2xl">🧠</span>
          </div>
          <div>
            <h3 className="font-bold text-xl text-purple-700 mb-2">
              Entraînement adaptatif
            </h3>
            <p className="text-sm text-muted-foreground">
              L'algorithme ajuste automatiquement la difficulté selon vos performances
            </p>
          </div>
        </div>
        
        {/* Stats visuals */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600/10 to-purple-600/5 text-center">
            <p className="text-2xl font-bold text-purple-700">4</p>
            <p className="text-xs text-muted-foreground">types d'ops</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600/10 to-purple-600/5 text-center">
            <p className="text-2xl font-bold text-purple-700">10</p>
            <p className="text-xs text-muted-foreground">niveaux</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600/10 to-purple-600/5 text-center">
            <p className="text-2xl font-bold text-purple-700">∞</p>
            <p className="text-xs text-muted-foreground">exercices</p>
          </div>
        </div>
        
      </div>
      
      {/* Card 3 - Tips contextuels */}
      <div className="bg-card rounded-xl p-6 shadow-sm 
                      border-2 border-transparent hover:border-[#FF7B00]/20 
                      transition-all hover:shadow-lg">
        
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl 
                          bg-gradient-to-br from-[#FF7B00]/10 to-[#FF7B00]/5
                          flex items-center justify-center">
            <span className="text-2xl">💡</span>
          </div>
          <div>
            <h3 className="font-bold text-xl text-[#FF7B00] mb-2">
              Tips au bon moment
            </h3>
            <p className="text-sm text-muted-foreground">
              Des astuces personnalisées apparaissent quand vous bloquez sur un type d'opération
            </p>
          </div>
        </div>
        
        {/* Example tip */}
        <div className="p-4 bg-[#FF7B00]/5 rounded-lg border-l-4 border-[#FF7B00] mt-4">
          <p className="text-sm font-medium mb-1">Exemple de tip :</p>
          <p className="text-xs text-muted-foreground italic">
            "Pour 47 × 8, décompose : (40 × 8) + (7 × 8) = 320 + 56 = 376"
          </p>
        </div>
        
      </div>
      
      {/* Card 4 - Stats & Analytics */}
      <div className="bg-card rounded-xl p-6 shadow-sm 
                      border-2 border-transparent hover:border-green-600/20 
                      transition-all hover:shadow-lg">
        
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl 
                          bg-gradient-to-br from-green-600/10 to-green-600/5
                          flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h3 className="font-bold text-xl text-green-700 mb-2">
              Analytics détaillés
            </h3>
            <p className="text-sm text-muted-foreground">
              Visualisez votre progression et identifiez vos axes d'amélioration
            </p>
          </div>
        </div>
        
        {/* Mock chart */}
        <div className="p-4 bg-gradient-to-br from-green-600/5 to-green-600/10 rounded-lg mt-4">
          <div className="flex items-end justify-between h-24 gap-2">
            {/* Fake bars chart */}
            <div className="flex-1 bg-green-600/30 rounded-t" style={{height: '40%'}} />
            <div className="flex-1 bg-green-600/40 rounded-t" style={{height: '60%'}} />
            <div className="flex-1 bg-green-600/50 rounded-t" style={{height: '75%'}} />
            <div className="flex-1 bg-green-600 rounded-t" style={{height: '90%'}} />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Progression sur 7 jours
          </p>
        </div>
        
      </div>
      
    </div>
    
    {/* Info box */}
    <div className="mt-12 p-6 bg-muted/50 rounded-xl text-center max-w-3xl mx-auto">
      <p className="text-sm text-muted-foreground">
        💡 <span className="font-medium text-foreground">Bon à savoir :</span> 
        Les utilisateurs qui s'entraînent 15 minutes par jour pendant 30 jours 
        augmentent leur score de <span className="font-bold text-[#0A6DFF]">+35%</span> en moyenne.
      </p>
    </div>
    
  </div>
  
</section>
```

---

## 2.B. Bento Box Alternative — Vertical List Style

**Format liste verticale** (plus de texte, moins de visuel)

```tsx
<div className="bg-card rounded-xl py-6 shadow-sm 
                border-2 border-transparent hover:border-[#0A6DFF]/20 
                transition-all">
  
  {/* Header */}
  <div className="px-6 mb-6">
    <h3 className="font-semibold text-2xl mb-2">
      Comment ça marche ?
    </h3>
    <p className="text-muted-foreground text-sm">
      Un parcours structuré pour progresser rapidement
    </p>
  </div>
  
  {/* Features list */}
  <div className="px-6 space-y-4">
    
    {/* Item 1 */}
    <div className="flex items-start gap-3">
      <svg className="w-5 h-5 text-[#0A6DFF] mt-0.5 flex-shrink-0">
        {/* Check circle icon */}
      </svg>
      <div>
        <p className="font-medium">Diagnostic initial (5 min)</p>
        <p className="text-sm text-muted-foreground">
          20 questions pour évaluer votre niveau et identifier vos lacunes
        </p>
      </div>
    </div>
    
    {/* Item 2 */}
    <div className="flex items-start gap-3">
      <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0">
        {/* Check circle icon */}
      </svg>
      <div>
        <p className="font-medium">Plan d'entraînement personnalisé</p>
        <p className="text-sm text-muted-foreground">
          L'algorithme crée un programme adapté à votre profil et vos objectifs
        </p>
      </div>
    </div>
    
    {/* Item 3 */}
    <div className="flex items-start gap-3">
      <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0">
        {/* Check circle icon */}
      </svg>
      <div>
        <p className="font-medium">Exercices adaptatifs quotidiens</p>
        <p className="text-sm text-muted-foreground">
          15 minutes par jour avec difficulté ajustée automatiquement
        </p>
      </div>
    </div>
    
    {/* Item 4 */}
    <div className="flex items-start gap-3">
      <svg className="w-5 h-5 text-[#FF7B00] mt-0.5 flex-shrink-0">
        {/* Check circle icon */}
      </svg>
      <div>
        <p className="font-medium">Tips et corrections instantanées</p>
        <p className="text-sm text-muted-foreground">
          Des astuces contextuelles pour comprendre vos erreurs et progresser
        </p>
      </div>
    </div>
    
  </div>
  
</div>
```

**Utilisation :**
- Plus de texte explicatif (parfait pour le "Comment ça marche")
- Icons colorées (check circle) pour rythmer visuellement
- Moins de place que le grid 2x3
- Bon pour mobile (stack naturel)

**Quand utiliser :**
- **Grid 2x3** → Features visuelles avec stats/graphiques
- **Liste verticale** → Process step-by-step ou features textuelles

---

## 2.C. Layout Recommandé — Mix des Deux Styles

**Section Features complète** (2 rangées)

```
┌────────────────────────────────────────────────────────────┐
│              Pourquoi MathCoach ?                          │
│     Un entraînement scientifique adaptatif                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │  🎯 Diagnostic IA   │  │  🧠 Adaptatif       │         │
│  │  (mini-features)    │  │  (stats visuals)    │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                            │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │  💡 Tips contextuels│  │  📊 Analytics       │         │
│  │  (example box)      │  │  (mock chart)       │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │         Comment ça marche ? (Liste verticale)        │ │
│  │                                                      │ │
│  │  ✓ Diagnostic initial (5 min)                       │ │
│  │  ✓ Plan personnalisé                                │ │
│  │  ✓ Exercices adaptatifs quotidiens                  │ │
│  │  ✓ Tips et corrections instantanées                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Code :**

```tsx
<section className="py-20 px-4 bg-gradient-to-b from-white to-[#0A6DFF]/5">
  
  <div className="max-w-6xl mx-auto">
    
    {/* Section header */}
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold mb-4">
        Pourquoi MathCoach ?
      </h2>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Un entraînement scientifique basé sur l'apprentissage adaptatif
      </p>
    </div>
    
    {/* Grid 2x2 - Features principales */}
    <div className="grid md:grid-cols-2 gap-6 mb-6">
      {/* 4 cards comme avant (Diagnostic, Adaptatif, Tips, Analytics) */}
    </div>
    
    {/* Card full-width - Process step-by-step */}
    <div className="bg-card rounded-xl py-6 shadow-sm 
                    border-2 border-transparent hover:border-[#0A6DFF]/20 
                    transition-all">
      
      <div className="px-6 mb-6">
        <h3 className="font-semibold text-2xl mb-2">
          Comment ça marche ?
        </h3>
        <p className="text-muted-foreground text-sm">
          Un parcours structuré pour progresser rapidement
        </p>
      </div>
      
      <div className="px-6 space-y-4">
        
        <div className="flex items-start gap-3">
          <CircleCheck className="w-5 h-5 text-[#0A6DFF] mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Diagnostic initial (5 min)</p>
            <p className="text-sm text-muted-foreground">
              20 questions pour évaluer votre niveau et identifier vos lacunes
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CircleCheck className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Plan d'entraînement personnalisé</p>
            <p className="text-sm text-muted-foreground">
              L'algorithme crée un programme adapté à votre profil et vos objectifs
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CircleCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Exercices adaptatifs quotidiens</p>
            <p className="text-sm text-muted-foreground">
              15 minutes par jour avec difficulté ajustée automatiquement
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CircleCheck className="w-5 h-5 text-[#FF7B00] mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Tips et corrections instantanées</p>
            <p className="text-sm text-muted-foreground">
              Des astuces contextuelles pour comprendre vos erreurs et progresser
            </p>
          </div>
        </div>
        
      </div>
      
    </div>
    
    {/* Info box final */}
    <div className="mt-12 p-6 bg-muted/50 rounded-xl text-center max-w-3xl mx-auto">
      <p className="text-sm text-muted-foreground">
        💡 <span className="font-medium text-foreground">Bon à savoir :</span> 
        Les utilisateurs qui s'entraînent 15 minutes par jour pendant 30 jours 
        augmentent leur score de <span className="font-bold text-[#0A6DFF]">+35%</span> en moyenne.
      </p>
    </div>
    
  </div>
  
</section>
```

**Structure :**
1. **Rangée 1** : Grid 2x2 (4 features avec visuels/stats)
2. **Rangée 2** : Full-width card (process step-by-step)
3. **Footer** : Info box avec stat clé

**Avantages :**
- Visuels attractifs en haut (grid 2x2)
- Process détaillé en bas (liste verticale)
- Responsive naturel (grid → stack)
- Rythme visuel varié

---

## 3. Section Témoignages (Fold 3)

**Carousel ou grid de 3 témoignages**

```tsx
<section className="py-20 px-4 bg-white">
  
  <div className="max-w-6xl mx-auto">
    
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold mb-4">
        Ils ont réussi avec MathCoach
      </h2>
      <p className="text-xl text-muted-foreground">
        De -60% à +95% de réussite aux tests psychotechniques
      </p>
    </div>
    
    <div className="grid md:grid-cols-3 gap-6">
      
      {/* Témoignage 1 */}
      <div className="p-6 rounded-xl bg-white border-2 border-border/20 
                      hover:border-[#0A6DFF]/20 transition-all hover:shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0A6DFF] to-[#FF7B00] 
                          flex items-center justify-center text-white font-bold">
            TD
          </div>
          <div>
            <p className="font-semibold">Thomas D.</p>
            <p className="text-xs text-muted-foreground">Candidat pilote ENAC</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground italic mb-4">
          "J'ai augmenté mon score de 62% à 94% en 3 semaines. 
          Les tips adaptatifs m'ont fait gagner un temps fou."
        </p>
        <div className="flex items-center gap-1 text-[#FF7B00]">
          ⭐⭐⭐⭐⭐
        </div>
      </div>
      
      {/* Témoignage 2 */}
      <div className="p-6 rounded-xl bg-white border-2 border-border/20 
                      hover:border-[#0A6DFF]/20 transition-all hover:shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 
                          flex items-center justify-center text-white font-bold">
            ML
          </div>
          <div>
            <p className="font-semibold">Marie L.</p>
            <p className="text-xs text-muted-foreground">Prépa McKinsey</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground italic mb-4">
          "Le diagnostic initial était super précis. L'algo s'adapte vraiment, 
          je me suis sentie challengée sans être frustrée."
        </p>
        <div className="flex items-center gap-1 text-[#FF7B00]">
          ⭐⭐⭐⭐⭐
        </div>
      </div>
      
      {/* Témoignage 3 */}
      <div className="p-6 rounded-xl bg-white border-2 border-border/20 
                      hover:border-[#0A6DFF]/20 transition-all hover:shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 
                          flex items-center justify-center text-white font-bold">
            AP
          </div>
          <div>
            <p className="font-semibold">Antoine P.</p>
            <p className="text-xs text-muted-foreground">Candidat trader</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground italic mb-4">
          "Interface ultra fluide. Le pavé numérique sur mobile, 
          c'est un vrai plus. J'ai pu m'entraîner partout."
        </p>
        <div className="flex items-center gap-1 text-[#FF7B00]">
          ⭐⭐⭐⭐⭐
        </div>
      </div>
      
    </div>
    
  </div>
  
</section>
```

---

## 4. CTA Final (Fold 4)

```tsx
<section className="py-20 px-4 bg-gradient-to-br from-[#0A6DFF] to-[#0A6DFF]/80 
                    relative overflow-hidden">
  
  {/* Background pattern */}
  <div className="absolute inset-0 opacity-10">
    {/* Grid pattern SVG */}
  </div>
  
  <div className="relative z-10 max-w-4xl mx-auto text-center">
    
    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
      Prêt à maîtriser le calcul mental ?
    </h2>
    
    <p className="text-xl text-white/90 mb-8">
      Rejoignez 2 847 candidats qui s'entraînent chaque jour
    </p>
    
    <button className="px-10 py-5 rounded-xl font-bold text-[#0A6DFF]
                     bg-white hover:bg-gray-50
                     shadow-[0_8px_30px_rgba(255,255,255,0.3)]
                     transition-all hover:scale-105 text-lg">
      Commencer gratuitement →
    </button>
    
    <p className="text-sm text-white/70 mt-4">
      Aucune carte bancaire requise • Diagnostic en 5 minutes
    </p>
    
  </div>
  
</section>
```

---

## Responsive Behavior

**Desktop (≥ 768px) :**
- Bento grid : 2 colonnes
- Témoignages : 3 colonnes
- Hero : texte centré large

**Mobile (< 768px) :**
- Bento grid : 1 colonne (stack)
- Témoignages : 1 colonne ou carousel swipe
- Hero : padding réduit, texte plus petit

---

## Animations (Framer Motion)

```tsx
// Fade in on scroll
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  viewport={{ once: true }}
>
  {/* Bento card */}
</motion.div>

// Hover scale
<motion.div
  whileHover={{ scale: 1.02 }}
  transition={{ type: "spring", stiffness: 300 }}
>
  {/* Card */}
</motion.div>
```

---

## Palette Couleurs

- **Primary blue** : `#0A6DFF`
- **Secondary orange** : `#FF7B00`
- **Purple** : `#7C3AED` (purple-600)
- **Green** : `#16A34A` (green-600)
- **Pink** : `#DB2777` (pink-600)

**Gradients :**
- Hero background : `from-[#0A6DFF]/5 via-white to-[#FF7B00]/5`
- Cards : `from-[color]/10 to-[color]/5`
- Logo/buttons : `from-[#0A6DFF] to-[#FF7B00]`

---

## Assets Requis

1. **Illustration hero** (optionnelle) — SVG ou PNG
2. **Icons** — Lucide React ou emoji
3. **Chart mockup** — SVG bars/lines pour stats card

---

**Prêt pour implémentation Next.js !** 🚀
