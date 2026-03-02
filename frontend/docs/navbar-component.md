# Navbar Component — MathCoach

**Style inspiré de PilotBoost** (header flottant avec blur + ombre douce)

---

## Structure Navbar

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo 🧮 MathCoach]     [Dashboard]          [Avatar CF]   │
│     (gradient bleu→orange)  (bouton centré)    (popup)      │
└─────────────────────────────────────────────────────────────┘
```

### Layout

- **Position** : `fixed top-4` (flottante)
- **Width** : `w-[90%] max-w-6xl` centré
- **Style** : 
  - `rounded-2xl`
  - `bg-white/80 backdrop-blur-md`
  - `shadow-[0_4px_20px_rgba(10,109,255,0.08)]`
  - `border border-border/20`

---

## Section Gauche — Logo + Nom

```tsx
<a href="/" className="flex items-center gap-2 group">
  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0A6DFF] to-[#FF7B00] 
                  flex items-center justify-center 
                  group-hover:scale-110 transition-transform">
    <CalculatorIcon className="w-5 h-5 text-white" />
    {/* ou 🧮 emoji */}
  </div>
  <span className="text-lg font-bold bg-clip-text text-transparent 
                   bg-gradient-to-r from-[#0A6DFF] to-[#FF7B00]">
    MathCoach
  </span>
</a>
```

**Comportement :**
- Hover → scale 110% sur le logo
- Gradient identique PilotBoost (`#0A6DFF` → `#FF7B00`)

---

## Section Centre — Bouton Dashboard

```tsx
<button 
  onClick={() => setDashboardOpen(true)}
  className="px-4 py-2 text-sm font-medium 
             text-muted-foreground hover:text-foreground 
             hover:bg-[#0A6DFF]/5 rounded-lg transition-all">
  Dashboard
</button>
```

**Comportement :**
- Clic → ouvre popup dashboard (overlay)
- Style minimal, hover bleu clair

---

## Section Droite — Avatar + Popup

```tsx
<button 
  onClick={() => setProfileOpen(!profileOpen)}
  className="flex items-center gap-2 px-4 
             hover:bg-[#0A6DFF]/5 rounded-lg transition-all h-[36px]">
  <span className="relative flex size-9 overflow-hidden rounded-full 
                   ring-2 ring-[#0A6DFF]/20 hover:ring-[#0A6DFF]/40 transition-all">
    <span className="flex size-full items-center justify-center rounded-full 
                     bg-gradient-to-br from-[#0A6DFF] to-[#FF7B00] 
                     text-white font-semibold text-sm">
      {user.initials} {/* Ex: "TD" pour Thomas D. */}
    </span>
  </span>
</button>

{profileOpen && (
  <div className="absolute top-16 right-4 w-64 rounded-2xl 
                  bg-white shadow-xl border border-border/20 p-4">
    {/* Contenu popup profil */}
  </div>
)}
```

**Comportement :**
- Clic avatar → toggle popup profil
- Ring effect au hover (`ring-[#0A6DFF]/40`)
- Initiales dans le cercle (pas de photo de profil)

---

## Popup Profil (Dropdown)

```
┌────────────────────────────┐
│  👤 Thomas D.              │
│  thomas@example.com        │
├────────────────────────────┤
│  📊 Niveau : 7/10          │
│  🔥 Streak : 7 jours       │
│  ✅ Précision : 87%        │
├────────────────────────────┤
│  [Statistiques détaillées] │
│  [Paramètres]              │
│  [Déconnexion]             │
└────────────────────────────┘
```

**Actions :**
- "Statistiques détaillées" → page stats complètes
- "Paramètres" → page settings
- "Déconnexion" → logout + redirect landing

---

## Popup Dashboard (Modal Centré)

```
┌─────────────────────────────────────────┐
│  📊 Dashboard                      [×]  │
├─────────────────────────────────────────┤
│                                         │
│  Séances complétées : 24                │
│  Exercices réussis : 342/387 (88%)      │
│  Temps total : 4h 32min                 │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 📈 Progression par type           │  │
│  │                                   │  │
│  │ Addition       ████████░░ 8/10    │  │
│  │ Multiplication ██████░░░░ 6/10    │  │
│  │ Division       █████░░░░░ 5/10    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Reprendre l'entrainement]             │
│  [Voir historique complet]              │
│                                         │
└─────────────────────────────────────────┘
```

**Comportement :**
- Clic "Dashboard" dans la navbar → ouvre modal centré
- Overlay semi-transparent (`bg-black/50`)
- Modal avec animation fade-in (Framer Motion)
- Clic hors modal ou [×] → ferme

---

## Responsive Mobile

```
┌─────────────────────────────────────────┐
│  [🧮]  MathCoach           [☰] [Avatar] │
└─────────────────────────────────────────┘
```

**Comportement mobile :**
- Logo + nom compacts
- Bouton hamburger [☰] → ouvre menu latéral
- Avatar reste visible
- Dashboard accessible via le menu latéral

---

## Palette de couleurs

- **Primary gradient** : `from-[#0A6DFF] to-[#FF7B00]`
- **Hover background** : `bg-[#0A6DFF]/5`
- **Ring avatar** : `ring-[#0A6DFF]/20` → `hover:ring-[#0A6DFF]/40`
- **Shadow** : `shadow-[0_4px_20px_rgba(10,109,255,0.08)]`
- **Backdrop blur** : `bg-white/80 backdrop-blur-md`

---

## TailwindCSS Classes

```tsx
// Navbar container
className="fixed top-4 left-0 right-0 mx-auto w-[90%] max-w-6xl z-50"

// Nav inner
className="rounded-2xl bg-white/80 backdrop-blur-md 
           shadow-[0_4px_20px_rgba(10,109,255,0.08)] 
           border border-border/20"

// Logo gradient
className="bg-gradient-to-br from-[#0A6DFF] to-[#FF7B00]"

// Text gradient
className="bg-clip-text text-transparent bg-gradient-to-r from-[#0A6DFF] to-[#FF7B00]"

// Avatar ring
className="ring-2 ring-[#0A6DFF]/20 hover:ring-[#0A6DFF]/40 transition-all"
```

---

## Stack Technique

- **Next.js 14** (App Router)
- **TailwindCSS** (v3.4+)
- **Framer Motion** (animations popup)
- **Lucide Icons** (comme PilotBoost)
- **Zustand** ou **Context** (state profileOpen / dashboardOpen)

---

## État initial

- Navbar visible sur **toutes les pages** sauf Landing (optionnel)
- **Pendant le diagnostic** : Logo seul (pas d'avatar, pas de bouton Dashboard)
- **Après authentification** : Avatar + Dashboard actifs
- Avatar affiche initiales dynamiques (calculées depuis `user.name`)
- Dashboard popup reste fermé par défaut

---

**Prêt pour intégration. J'attends le hero section pour compléter le style !** 🚀
