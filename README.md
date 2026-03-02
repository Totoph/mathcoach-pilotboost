# 🧮 MathCoach by PilotBoost

**Entraînement adaptatif au calcul mental avec coach IA personnel.**

Conçu pour la préparation aux concours (pilotes, consulting, finance) avec une progression personnalisée en temps réel.

---

## 🏗️ Architecture

### Backend (FastAPI)
- **Python 3.11+** / FastAPI
- **Supabase** (PostgreSQL + Auth)
- **Agent IA** adaptatif et conversationnel
- Hébergement : Railway

### Frontend (Next.js 15)
- **Next.js 15** (App Router)
- **TypeScript** + **Tailwind CSS**
- Interface responsive avec pavé numérique + chat temps réel
- Hébergement : Vercel

### Base de données (Supabase)
- **Profiles** : données utilisateur
- **Agent Instances** : état de l'IA pour chaque utilisateur
- **Conversations** : historique des échanges
- **Exercise Performances** : performances détaillées

---

## 🚀 Démarrage rapide

### 1. Supabase Setup

1. Créer un projet sur [Supabase](https://supabase.com)
2. Exécuter les schemas SQL :
   ```sql
   -- Dans Supabase SQL Editor
   -- 1. Exécuter supabase/schema.sql
   -- 2. Exécuter supabase/agent_schema.sql
   ```
3. Récupérer les credentials :
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (pour le backend)

### 2. Backend (local)

```bash
cd backend

# Créer un virtualenv
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Créer .env
cp .env.example .env
# Éditer .env avec vos credentials Supabase

# Lancer le serveur
uvicorn app.main:app --reload
```

Le backend sera disponible sur `http://localhost:8000`

### 3. Frontend (local)

```bash
cd frontend

# Installer les dépendances
npm install

# Créer .env.local
cp .env.example .env.local
# Éditer .env.local avec vos credentials

# Lancer le dev server
npm run dev
```

Le frontend sera disponible sur `http://localhost:3000`

---

## 📁 Structure du projet

```
mathcoach-pilotboost/
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── auth.py
│   │   │   ├── agent.py       ← Routes Agent IA
│   │   │   ├── exercises.py
│   │   │   └── users.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── supabase.py
│   │   │   └── auth.py
│   │   ├── schemas/
│   │   │   ├── agent.py        ← Modèles Agent
│   │   │   ├── exercise.py
│   │   │   └── user.py
│   │   ├── services/
│   │   │   ├── agent_service.py ← Logique IA
│   │   │   ├── adaptive.py
│   │   │   └── exercise_generator.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── dashboard/page.tsx   ← Hub principal
│   │   ├── train/page.tsx       ← Interface entraînement
│   │   ├── stats/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx             ← Landing page
│   │   └── globals.css
│   ├── lib/
│   │   ├── supabase.ts          ← Client Supabase
│   │   └── api.ts               ← Client API backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── .env.example
├── supabase/
│   ├── schema.sql               ← Schema de base
│   └── agent_schema.sql         ← Schema Agent IA
├── docker-compose.yml
└── README.md
```

---

## 🧠 Fonctionnalités Agent IA

L'agent IA est le cœur de MathCoach :

- **Diagnostic initial** : évalue le niveau de l'utilisateur
- **Adaptation en temps réel** : ajuste la difficulté selon les performances
- **Conversation** : répond aux questions, encourage, donne des tips
- **Persistence** : sauvegarde tout l'historique et l'état
- **Focus intelligent** : cible les faiblesses détectées

### API Agent (`/api/v1/agent/*`)

- `POST /init` : Initialise l'agent (premier login)
- `GET /state` : État actuel de l'agent
- `POST /next-exercise` : Génère le prochain exercice
- `POST /submit-answer` : Soumet une réponse + récupère feedback
- `POST /chat` : Conversation libre avec l'agent
- `GET /history` : Historique de conversation

---

## 🎨 UX Highlights

### Landing Page
- Hero avec gradient + CTA
- Grid de features (4 cartes)
- "Comment ça marche" (3 étapes)

### Dashboard
- Vue d'ensemble (niveau, stats)
- Message du coach
- CTA pour continuer l'entraînement
- Points forts / faiblesses

### Interface d'entraînement
- **Layout split** : exercice (60%) + chat (40%)
- **Pavé numérique** cliquable au centre
- **Chat temps réel** à droite avec l'agent
- Tips contextuels en bas
- Feedback instantané après chaque réponse

---

## 🚢 Déploiement

### Backend (Railway)

1. Connecter le repo GitHub
2. Variables d'env :
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   FRONTEND_URL=https://mathcoach.pilotboost.fr
   ```
3. Railway détecte automatiquement le `Dockerfile`

### Frontend (Vercel)

1. Connecter le repo GitHub
2. Root directory : `frontend`
3. Variables d'env :
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
4. Deploy automatique sur chaque push

### Domaine personnalisé

- Configurer `mathcoach.pilotboost.fr` sur Vercel
- Mettre à jour `FRONTEND_URL` sur Railway

---

## 📊 Prochaines étapes (Roadmap)

- [ ] **Stats avancées** : graphiques de progression
- [ ] **Mode concours** : simulation de tests réels
- [ ] **Système de badges** : achievements
- [ ] **Multi-device sync** : cross-device state
- [ ] **Mode vocal** : TTS pour les questions
- [ ] **Leaderboards** : classement anonyme
- [ ] **Objectifs personnalisés** : concours spécifiques

---

## 🧑‍💻 Développement

**Stack technique :**
- Backend : Python 3.11, FastAPI, Supabase
- Frontend : Next.js 15, TypeScript, Tailwind CSS
- Infra : Railway (backend), Vercel (frontend), Supabase (DB)

**Commandes utiles :**

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Build production
npm run build
npm start
```

---

## 📄 License

Proprietary - © 2026 PilotBoost

---

**Conçu et développé par MathCoach Director 🧮 avec ❤️**
