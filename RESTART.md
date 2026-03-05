# Guide de redémarrage complet - MathCoach

## Prérequis système

Sur le serveur hôte (srv1406901), installer les paquets Python nécessaires :

```bash
apt update
apt install -y python3-venv python3-pip
```

## 1. Backend (FastAPI)

```bash
cd /docker/openclaw-sosi/data/.openclaw/workspace-mathcoach/mathcoach-pilotboost/backend

# Créer le venv
python3 -m venv venv

# Activer le venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Le backend sera accessible sur **http://localhost:8000**

## 2. Frontend (Next.js)

Dans un **nouveau terminal** :

```bash
cd /docker/openclaw-sosi/data/.openclaw/workspace-mathcoach/mathcoach-pilotboost/frontend

# Installer les dépendances (si pas déjà fait)
npm install

# Lancer le dev server
npm run dev
```

Le frontend sera accessible sur **http://localhost:3000**

## 3. Vérification

- Backend health : `curl http://localhost:8000/health`
- Backend docs : http://localhost:8000/docs
- Frontend : http://localhost:3000

## Notes

- **Backend** : Port 8000 (FastAPI/Uvicorn)
- **Frontend** : Port 3000 (Next.js)
- **Base de données** : Supabase (distant, pas de setup local)

## Variables d'environnement

Backend : `/backend/.env` (déjà configuré)
Frontend : `/frontend/.env.local` (déjà configuré)

## Arrêter les serveurs

- `Ctrl+C` dans chaque terminal
- Ou tuer les processus :
  ```bash
  pkill -f uvicorn
  pkill -f "next-server"
  ```

## Troubleshooting

**Port déjà utilisé ?**
```bash
# Trouver le processus
lsof -i :8000
lsof -i :3000

# Tuer le processus
kill -9 <PID>
```

**Module manquant ?**
```bash
# Backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend
npm install
```
