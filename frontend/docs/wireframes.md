# Wireframes MathCoach by PilotBoost

## 1. Landing Page (Non-authentifié)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo MathCoach]                    [Se connecter] [S'inscrire] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│            🧮 MathCoach by PilotBoost                       │
│                                                             │
│     Entraîne-toi au calcul mental pour réussir              │
│              tes concours (pilotes, consulting)             │
│                                                             │
│              [Commencer gratuitement →]                     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  📊 Adaptatif│  │  ⚡ Efficace │  │  🎯 Ciblé    │     │
│  │              │  │              │  │              │     │
│  │  S'adapte à  │  │  Sessions    │  │  Prépare les │     │
│  │  ton niveau  │  │  15-30 min   │  │  concours    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Actions :**
- Clic "Commencer" → Signup
- Clic "Se connecter" → Login

---

## 2. Login / Signup

```
┌─────────────────────────────────────────────────────────────┐
│  [← Retour]              MathCoach                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Créer un compte                          │
│                                                             │
│    Email     [_________________________________]            │
│                                                             │
│    Mot de passe [_________________________________]         │
│                                                             │
│    Prénom    [_________________________________]            │
│                                                             │
│              [Créer mon compte →]                           │
│                                                             │
│         Déjà inscrit ? [Se connecter]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Actions :**
- Signup → API `/auth/signup` → Onboarding
- Login → API `/auth/login` → Dashboard (si diagnostic fait) ou Onboarding (sinon)

---

## 3. Onboarding (Diagnostic initial)

```
┌─────────────────────────────────────────────────────────────┐
│  MathCoach                              [Déconnexion]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              🎯 Évaluation initiale                         │
│                                                             │
│       Étape 1/3 — Quel concours prépares-tu ?               │
│                                                             │
│       ○  ENAC (Pilote de ligne)                             │
│       ○  McKinsey / BCG (Consulting)                        │
│       ○  Autre                                              │
│                                                             │
│                                                             │
│                      [Suivant →]                            │
│                                                             │
│                    ●○○ (Progress)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Flow :**
1. Choix concours
2. Mini-diagnostic (5-10 calculs rapides pour évaluer le niveau)
3. Confirmation → Dashboard

**Actions :**
- Fin diagnostic → API `/exercises/diagnostic` → Dashboard

---

## 4. Dashboard (Accueil authentifié)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] MathCoach          [Profil] [Paramètres] [Déco]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Salut Thomas ! 👋                                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📊 Ta progression                                   │  │
│  │                                                      │  │
│  │  Niveau : ███████░░░ 7/10                           │  │
│  │  Précision : 87%                                     │  │
│  │  Temps moyen : 4.2s                                  │  │
│  │                                                      │  │
│  │  Points faibles : multiplication 2 chiffres         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ⚡ Séance recommandée                               │  │
│  │                                                      │  │
│  │  Multiplications avancées                            │  │
│  │  15 exercices • ~10 min                              │  │
│  │                                                      │  │
│  │              [Démarrer la séance →]                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Historique] [Statistiques détaillées] [Réglages]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Actions :**
- "Démarrer" → Session d'exercice
- "Profil" → Profil/Stats
- "Historique" → Liste des séances passées

---

## 5. Session d'exercice (Adaptive Training)

```
┌─────────────────────────────────────────────────────────────┐
│  [← Quitter]          Séance en cours           [?] Aide    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Exercice 3/15                        ⏱️  00:12             │
│  ████████░░░░░░░░░░░░░░░                                    │
│                                                             │
│                                                             │
│                   42 × 17 = ?                               │
│                                                             │
│                                                             │
│              [_________________]                            │
│                                                             │
│                  [Valider →]                                │
│                                                             │
│  💡 Tip : Décompose (40×17) + (2×17)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Flow :**
- Exercice → Réponse → Feedback (correct ✅ / incorrect ❌ + tip)
- Tip adaptatif basé sur l'erreur (API `/exercises/tips`)
- Fin séance → Résumé + retour Dashboard

**Actions :**
- Submit → API `/exercises/submit`
- Fin → API `/exercises/complete` → Dashboard

---

## 6. Profil / Stats détaillées

```
┌─────────────────────────────────────────────────────────────┐
│  [← Retour]              Profil                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Thomas D.                                     [Modifier]   │
│  thomas@example.com                                         │
│  Objectif : ENAC (Pilote)                                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📈 Statistiques globales                            │  │
│  │                                                      │  │
│  │  Séances complétées : 24                             │  │
│  │  Exercices réussis : 342 / 387 (88%)                 │  │
│  │  Temps total : 4h 32min                              │  │
│  │  Streak actuel : 🔥 7 jours                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🎯 Progression par type                             │  │
│  │                                                      │  │
│  │  Addition          ████████░░  8/10                  │  │
│  │  Soustraction      ███████░░░  7/10                  │  │
│  │  Multiplication    ██████░░░░  6/10                  │  │
│  │  Division          █████░░░░░  5/10                  │  │
│  │  Fractions         ████░░░░░░  4/10                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Actions :**
- "Modifier" → Formulaire update profil
- Graphiques détaillés (optionnel : Chart.js)

---

## Résumé des écrans principaux

1. **Landing** → Présentation + CTA
2. **Auth** → Login/Signup (Supabase)
3. **Onboarding** → Diagnostic initial (1x par user)
4. **Dashboard** → Hub central (progression + séance recommandée)
5. **Session** → Exercices adaptatifs + tips en temps réel
6. **Profil** → Stats détaillées + historique

---

## Stack frontend proposée

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS** (design system)
- **Supabase Auth** (client-side)
- **Axios** ou **fetch** pour API backend
- **React Hook Form** (formulaires)
- **Chart.js** ou **Recharts** (graphs stats)

---

## Questions pour toi

1. **Design system** : tu as une charte graphique (couleurs, logo) ou je pars sur un style minimaliste/moderne ?
2. **Mobile-first** : priorité mobile ou desktop ?
3. **Gamification** : badges, streaks, classement entre users ?
4. **Abonnement** : prévoir un paywall (freemium) dès le début ?

**Valide les wireframes et réponds aux questions, je code ensuite !** 🚀
