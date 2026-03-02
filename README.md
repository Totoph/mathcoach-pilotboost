# MathCoach by PilotBoost 🧮✈️

**AI-powered mental math training for competitive exam preparation**

Live at: [mathcoach.pilotboost.fr](https://mathcoach.pilotboost.fr)

## What is this?

MathCoach helps young adults prepare for the mental math sections of competitive exams (airline pilot, consulting, finance). It adapts to your level, detects your weaknesses, and provides targeted tips and techniques to improve.

## Features

- 🎯 **Adaptive difficulty** — Automatically adjusts to your level
- 📊 **Diagnostic test** — Initial placement to find your starting level
- 🧠 **9 exercise categories** — Addition, subtraction, multiplication, division, percentages, fractions, estimation, sequences, mixed
- ⏱️ **Timed exercises** — Practice under pressure like the real exams
- 📈 **Progress tracking** — See your improvement over time
- 🔍 **Weakness detection** — Identifies your problem areas
- 💡 **Smart tips** — Targeted mental math techniques for each category
- 🏆 **Points & streaks** — Stay motivated

## Tech Stack

- **Backend:** Python / FastAPI (Railway)
- **Database:** Supabase (PostgreSQL + Auth)
- **Frontend:** Next.js (TBD)
- **Domain:** mathcoach.pilotboost.fr

## Setup

### Backend

```bash
cd backend
cp .env.example .env  # Fill in your keys
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Database

Run `supabase/schema.sql` in your Supabase SQL Editor.

### Deploy (Railway)

Connect this repo to Railway, set the root directory to `backend/`, and configure env vars.

## API Docs

Once running: `http://localhost:8000/docs` (Swagger UI)
