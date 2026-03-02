# Wireframes MathCoach v2 — Style PilotBoost

**Style inspiré de pilotboost.fr** :
- Dégradé bleu clair en hero
- Cards arrondies avec ombres douces
- Typographie moderne (Inter/SF Pro)
- Boutons avec gradient bleu
- Design épuré, focus contenu

---

## 1. Landing Page (Non-authentifié)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo MathCoach]                         [Connexion]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         ╔═══════════════════════════════════╗              │
│         ║   Dégradé bleu clair (hero)      ║              │
│         ║                                   ║              │
│         ║   🧮 Maîtrisez le calcul mental   ║              │
│         ║                                   ║              │
│         ║   Entraînez-vous pour réussir vos ║              │
│         ║   concours (pilotes, consulting)  ║              │
│         ║                                   ║              │
│         ║   [Commencer l'entrainement]     ║              │
│         ║        (Bouton gradient bleu)     ║              │
│         ╚═══════════════════════════════════╝              │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────┐ │
│  │  📊 Adaptatif   │  │  ⚡ Efficace     │  │ 🎯 Ciblé │ │
│  │                  │  │                  │  │          │ │
│  │  S'adapte à ton  │  │  Sessions        │  │ Prépare  │ │
│  │  niveau en       │  │  15-30 min       │  │ les      │ │
│  │  temps réel      │  │  efficaces       │  │ concours │ │
│  └──────────────────┘  └──────────────────┘  └──────────┘ │
│                                                             │
│  [Témoignages / Social proof si besoin]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Actions :**
- Clic "Commencer l'entrainement" → Onboarding (sans auth)
- Clic "Connexion" → Login form

---

## 2. Onboarding — Évaluation initiale (Langage naturel)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo MathCoach]                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                                                             │
│              🎯 Bienvenue sur MathCoach                     │
│                                                             │
│        Pourquoi souhaitez-vous utiliser ce produit ?       │
│                                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [Barre de dialogue en langage naturel]            │   │
│  │  Tapez votre réponse ici...                  [Send]│   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 Ex : "Je prépare le concours ENAC" ou "Je veux         │
│      améliorer mon calcul mental pour le consulting"       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Flow :**
- Utilisateur tape sa réponse en langage naturel
- API analyse et détecte le sujet/objectif (ENAC, consulting, etc.)
- Enregistre dans DB (table `users.goal` ou similaire)
- → Transition vers Test de 1 min

**Backend :**
- API `/onboarding/goal` (POST)
- Utilise GPT/Claude pour extraire l'intention
- Stocke `user_goal: "ENAC"` ou `user_goal: "consulting"`

---

## 3. Test Diagnostic (20 questions — même interface que exercices)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo MathCoach]     Diagnostic 3/20        ⏱️  01:23     │
├───────────────────────────────────────────────┬─────────────┤
│                                               │             │
│                                               │  💬 Chat    │
│                                               │   (désactivé│
│              12 + 47 = ?                      │    pendant  │
│                                               │    diagnostic)│
│       ┌─────────────────────┐                │             │
│       │                     │                │             │
│       │    [Input field]    │                │             │
│       │                     │                │             │
│       └─────────────────────┘                │             │
│                                               │             │
│       ┌─────────────────────┐                │             │
│       │  7   8   9    ←     │                │             │
│       │  4   5   6    ✓     │                │             │
│       │  1   2   3    ✗     │                │             │
│       │     0       Enter   │                │             │
│       └─────────────────────┘                │             │
│           Pavé numérique                      │             │
│                                               │             │
│  ███░░░░░░░░░░░░░░░░░ (Progress bar)         │             │
│                                               │             │
└───────────────────────────────────────────────┴─────────────┘
```

**Différences avec exercices normaux :**
- **20 questions** pour évaluer le niveau initial
- **Pas de feedback immédiat** (pas de ✅/❌ entre les questions)
- **Chat bar désactivée** (pas de tips pendant le diagnostic)
- **Pas de temps limite strict** (mais timer affiché pour info)
- Progress bar : 20 étapes

**Flow :**
1. User répond aux 20 questions avec le pavé numérique
2. Chaque réponse est stockée (mais pas de feedback)
3. À la fin → calcul du niveau initial basé sur :
   - Précision (nombre de bonnes réponses)
   - Temps moyen par question
   - Types d'erreurs
4. → Redirect vers Signup

**Backend :**
- API `/exercises/diagnostic/next` (GET) → génère la prochaine question
- API `/exercises/diagnostic/submit` (POST) → stocke réponse sans feedback
- API `/exercises/diagnostic/complete` (POST) → calcule niveau initial
- Retourne `initial_level: 3` (sur 10) + profil d'erreurs

---

## 4. Signup (Création de compte)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo MathCoach]                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│              ✅ Super ! Créez votre compte                  │
│                                                             │
│         Pour sauvegarder votre progression                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Email      [_____________________________]        │   │
│  │                                                     │   │
│  │  Mot de passe [_____________________________]      │   │
│  │                                                     │   │
│  │             [Créer mon compte →]                    │   │
│  │                 (Gradient bleu)                     │   │
│  │                                                     │   │
│  │       Déjà inscrit ? [Se connecter]                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Actions :**
- Signup → API `/auth/signup`
- Supabase Auth (email + password)
- Associe le `user_goal` et `initial_level` au user_id
- → Redirect vers Dashboard initial

---

## 5. Dashboard Initial — Chat bar (Qu'est-ce que tu veux faire ?)

```
┌─────────────────────────────────────────────────────────────┐
│  [Avatar] MathCoach                      [Dashboard] [Déco] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              👋 Salut Thomas !                              │
│                                                             │
│          Que souhaitez-vous faire aujourd'hui ?             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [Barre de dialogue]                                │   │
│  │  Ex: "Je veux m'entrainer" ou "Voir mes stats" [→] │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 Dites simplement ce que vous voulez faire !            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Flow :**
- User tape "s'entrainer" ou similaire
- API détecte l'intention → lance session d'exercices
- → Redirect vers Screen Exercice

**Backend :**
- API `/chat/intent` (POST message)
- Retourne `intent: "training"` ou `intent: "stats"`
- Si training → génère session et redirect

---

## 6. Screen Exercice (Pavé numérique + Chat bar)

**⚠️ Même interface pour :**
- **Diagnostic initial** (20 questions, pas de feedback, chat désactivé)
- **Exercices normaux** (feedback immédiat, tips adaptatifs, chat actif)

```
┌─────────────────────────────────────────────────────────────┐
│  [Avatar]     Exercice 3/15        ⏱️  00:23  [Dashboard] │
├───────────────────────────────────────────────┬─────────────┤
│                                               │             │
│                                               │   💬 Chat   │
│                                               │             │
│              42 × 17 = ?                      │  [Aide?]    │
│                                               │             │
│                                               │  Tips       │
│       ┌─────────────────────┐                │  cachés     │
│       │                     │                │  par défaut │
│       │    [Input field]    │                │             │
│       │                     │                │  S'affichent│
│       └─────────────────────┘                │  si         │
│                                               │  difficulté │
│       ┌─────────────────────┐                │  détectée   │
│       │  7   8   9    ←     │                │             │
│       │  4   5   6    ✓     │                │  [Réponse]  │
│       │  1   2   3    ✗     │                │             │
│       │     0       Enter   │                │             │
│       └─────────────────────┘                │             │
│           Pavé numérique                      │             │
│                                               │             │
│  ████████░░░░░░░░ (Progress bar)             │             │
│                                               │             │
└───────────────────────────────────────────────┴─────────────┘
```

**Layout :**
- **Haut gauche** : Avatar utilisateur (cliquable → popup profil) *ou Logo si diagnostic*
- **Centre haut** : "Exercice 3/15" *ou "Diagnostic 3/20"*
- **Haut droite** : Timer + bouton Dashboard
- **Centre** : Question + input + pavé numérique
- **Progress bar** en bas
- **Droite** : Chat bar (sidebar fixe)

**Différence Diagnostic vs Exercices :**

| Élément | Diagnostic (20Q) | Exercices normaux |
|---------|------------------|-------------------|
| **Feedback** | ❌ Pas de feedback immédiat | ✅ Feedback après chaque réponse |
| **Chat bar** | 🚫 Désactivée | ✅ Active (tips adaptatifs) |
| **Avatar** | Logo MathCoach | Avatar user |
| **Dashboard** | 🚫 Bouton caché | ✅ Accessible |
| **Tips** | ❌ Pas de tips | ✅ Tips si difficulté détectée |
| **Progress** | 20 étapes | 15 étapes (par session) |

**Chat bar (sidebar droite) — Mode Exercices uniquement :**
- Toujours visible
- Par défaut : icône 💬 minimaliste
- Tips cachés par défaut
- Si user bloqué > 15s → affiche tip automatiquement
- User peut demander de l'aide via le chat

**Pavé numérique :**
- Boutons 0-9 + Enter + ← (delete) + ✓ (validate) + ✗ (clear)
- Clavier physique aussi accepté
- Identique pour diagnostic et exercices

**Actions (Mode Exercices) :**
- Enter ou ✓ → Submit answer → API `/exercises/submit`
- Feedback immédiat (correct ✅ ou incorrect ❌)
- Si incorrect → affiche tip adaptatif dans la chat bar
- Fin des 15 exercices → Résumé + retour Dashboard

**Actions (Mode Diagnostic) :**
- Enter ou ✓ → Submit answer → API `/exercises/diagnostic/submit`
- Pas de feedback (passe directement à la question suivante)
- Fin des 20 questions → Calcul niveau + Redirect Signup

---

## 7. Popup Profil (Clic sur avatar)

```
┌─────────────────────────────────────────────────────────────┐
│  [Avatar]     Exercice 3/15        ⏱️  00:23  [Dashboard] │
├───────────────────────────────────────────────┬─────────────┤
│                                               │             │
│  ┌───────────────────────────┐               │             │
│  │  👤 Profil                │               │             │
│  ├───────────────────────────┤               │             │
│  │                           │               │             │
│  │  Thomas D.                │               │             │
│  │  thomas@example.com       │               │             │
│  │                           │               │             │
│  │  📊 Niveau : 7/10         │               │             │
│  │  🔥 Streak : 7 jours      │               │             │
│  │  ✅ Précision : 87%       │               │             │
│  │                           │               │             │
│  │  [Voir stats détaillées]  │               │             │
│  │  [Paramètres]             │               │             │
│  │  [Déconnexion]            │               │             │
│  │                           │               │             │
│  └───────────────────────────┘               │             │
│                                               │             │
└───────────────────────────────────────────────┴─────────────┘
```

**Actions :**
- Clic avatar → overlay popup (style pilotboost)
- "Voir stats détaillées" → Page/Modal stats complètes
- "Paramètres" → Page settings
- "Déconnexion" → logout

---

## 8. Popup Dashboard (Bouton en haut à droite)

```
┌─────────────────────────────────────────────────────────────┐
│  [Avatar]     Exercice 3/15        ⏱️  00:23  [Dashboard] │
├───────────────────────────────────────────────┬─────────────┤
│                                               │             │
│                  ┌─────────────────────────────────────┐   │
│                  │  📊 Dashboard              [×]      │   │
│                  ├─────────────────────────────────────┤   │
│                  │                                     │   │
│                  │  Séances complétées : 24            │   │
│                  │  Exercices réussis : 342/387 (88%)  │   │
│                  │  Temps total : 4h 32min             │   │
│                  │                                     │   │
│                  │  ┌───────────────────────────────┐  │   │
│                  │  │ 📈 Progression par type       │  │   │
│                  │  │                               │  │   │
│                  │  │ Addition      ████████░░ 8/10 │  │   │
│                  │  │ Multiplication ██████░░░░ 6/10│  │   │
│                  │  │ Division       █████░░░░░ 5/10│  │   │
│                  │  └───────────────────────────────┘  │   │
│                  │                                     │   │
│                  │  [Reprendre l'entrainement]         │   │
│                  │  [Voir historique complet]          │   │
│                  │                                     │   │
│                  └─────────────────────────────────────┘   │
│                                               │             │
└───────────────────────────────────────────────┴─────────────┘
```

**Actions :**
- Clic "Dashboard" → overlay popup (modal centré)
- Vue rapide des stats
- "Reprendre l'entrainement" → retour exercices
- "Voir historique complet" → page stats détaillées

---

## Résumé du Flow Complet

1. **Landing** → Clic "Commencer l'entrainement"
2. **Onboarding** → Chat bar : "Pourquoi tu veux utiliser MathCoach ?"
3. **Test diagnostic** → 20 questions avec pavé numérique (pas de feedback immédiat, chat désactivé)
4. **Signup** → Email + password
5. **Dashboard initial** → Chat bar : "Que veux-tu faire ?" → User répond "s'entrainer"
6. **Exercices** → Pavé numérique + chat bar sidebar (tips cachés, feedback immédiat)
7. **Profil popup** → Clic avatar → stats rapides + actions
8. **Dashboard popup** → Bouton dashboard → vue stats rapides

---

## Stack Technique Frontend

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS** (pour reproduire le style PilotBoost)
- **Framer Motion** (animations fluides)
- **Supabase Auth** (client-side)
- **Axios** pour API backend
- **React Hook Form** (formulaires)
- **Zustand** ou **Context** (state management)

---

## Palette de couleurs (inspirée PilotBoost)

- **Primary** : Bleu gradient `#3B82F6` → `#1D4ED8`
- **Background hero** : Dégradé bleu clair `#DBEAFE` → `#BFDBFE`
- **Text** : Gris foncé `#1F2937`
- **Accent** : Orange/jaune pour tips/feedback `#F59E0B`
- **Success** : Vert `#10B981`
- **Error** : Rouge `#EF4444`

---

## Questions finales avant dev

1. **Chat bar IA** : tu veux utiliser un modèle LLM pour gérer les réponses (GPT-4o-mini via backend) ou juste des règles simples ?
2. **Tips adaptatifs** : affichage automatique après X secondes ou uniquement si user demande ?
3. **Mobile** : priorité mobile-first ou desktop d'abord ?
4. **Animations** : transitions fluides (Framer Motion) ou minimaliste ?

**Valide ces wireframes et réponds aux questions, je code le frontend !** 🚀
