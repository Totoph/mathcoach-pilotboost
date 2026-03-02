# 🚀 Guide de déploiement - MathCoach by PilotBoost

## Prérequis

- Compte Supabase (gratuit)
- Compte Railway (backend)
- Compte Vercel (frontend)
- Repo GitHub connecté

---

## Étape 1 : Supabase Setup

### 1.1 Créer le projet

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Choisir une région (Europe recommandé)
4. Noter le mot de passe de la DB

### 1.2 Exécuter les schemas SQL

Dans le SQL Editor de Supabase :

```sql
-- 1. Copier/coller le contenu de supabase/schema.sql
-- 2. Exécuter
-- 3. Copier/coller le contenu de supabase/agent_schema.sql
-- 4. Exécuter
```

### 1.3 Récupérer les credentials

Dans `Settings > API` :

- **URL** : `https://xxxxx.supabase.co`
- **anon/public key** : pour le frontend
- **service_role key** : pour le backend (⚠️ secret !)

### 1.4 Configurer Auth

Dans `Authentication > Providers` :

- Activer "Email" provider
- Désactiver email confirmation (pour MVP) ou configurer SMTP
- Dans `URL Configuration`, ajouter :
  - Site URL : `https://mathcoach.pilotboost.fr`
  - Redirect URLs : `https://mathcoach.pilotboost.fr/**`

---

## Étape 2 : Backend (Railway)

### 2.1 Connecter le repo

1. Aller sur [railway.app](https://railway.app)
2. New Project > Deploy from GitHub repo
3. Sélectionner `mathcoach-pilotboost`
4. Root directory : `/` (Railway détecte le Dockerfile)

### 2.2 Variables d'environnement

Dans Railway Settings > Variables :

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  ← service_role key
FRONTEND_URL=https://mathcoach.pilotboost.fr
```

### 2.3 Déployer

- Railway build et déploie automatiquement
- Récupérer l'URL publique : `https://mathcoach-production.up.railway.app`

### 2.4 Configurer le domaine (optionnel)

Si tu veux un sous-domaine custom pour l'API :

- Settings > Domains
- Ajouter `api.mathcoach.pilotboost.fr`

---

## Étape 3 : Frontend (Vercel)

### 3.1 Connecter le repo

1. Aller sur [vercel.com](https://vercel.com)
2. Import Project > GitHub
3. Sélectionner `mathcoach-pilotboost`
4. **Root Directory** : `frontend` ⚠️

### 3.2 Variables d'environnement

Dans Project Settings > Environment Variables :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  ← anon/public key
NEXT_PUBLIC_API_URL=https://mathcoach-production.up.railway.app
```

**Important** : Ces 3 variables doivent être définies pour **Production**, **Preview** et **Development**.

### 3.3 Build Settings

Vercel détecte automatiquement Next.js :

- Framework Preset : `Next.js`
- Build Command : `npm run build`
- Output Directory : `.next`
- Install Command : `npm install`

### 3.4 Déployer

- Cliquer sur **Deploy**
- Attendre la build (~2-3 min)
- Une fois déployé, récupérer l'URL : `https://mathcoach-xxx.vercel.app`

### 3.5 Domaine personnalisé

Dans Settings > Domains :

1. Ajouter `mathcoach.pilotboost.fr`
2. Vercel donne les DNS records à configurer
3. Aller sur le registrar de domaine (OVH, Cloudflare, etc.)
4. Ajouter :
   ```
   Type: CNAME
   Name: mathcoach
   Value: cname.vercel-dns.com
   ```
5. Attendre propagation DNS (~10 min)

---

## Étape 4 : Mise à jour des CORS

### Backend (Railway)

Si tu as configuré un domaine custom, mettre à jour `FRONTEND_URL` dans Railway :

```env
FRONTEND_URL=https://mathcoach.pilotboost.fr
```

Le backend FastAPI autorise déjà ce domaine dans les CORS (voir `app/main.py`).

---

## Étape 5 : Test complet

1. Ouvrir `https://mathcoach.pilotboost.fr`
2. Créer un compte (Sign up)
3. Vérifier redirection vers Dashboard
4. Lancer un exercice (Train)
5. Vérifier :
   - Génération de questions
   - Pavé numérique fonctionne
   - Chat avec l'agent
   - Submit answer + feedback
   - Stats mise à jour

---

## 🔧 Troubleshooting

### Erreur 500 sur signup

- Vérifier que les 2 schemas SQL sont bien exécutés dans Supabase
- Vérifier que le trigger `on_auth_user_created` existe

### CORS errors

- Vérifier que `FRONTEND_URL` dans Railway correspond au domaine frontend exact
- Vérifier que `NEXT_PUBLIC_API_URL` dans Vercel pointe vers Railway

### Agent init fails

- Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est bien défini dans Railway (pas l'anon key !)
- Vérifier les RLS policies dans Supabase (`service_role` doit avoir full access)

### Frontend ne charge pas

- Vérifier que `frontend` est bien le Root Directory dans Vercel
- Vérifier les 3 variables d'env dans Vercel
- Rebuild le projet

---

## 📊 Monitoring

### Backend (Railway)

- Logs : Railway > Deployments > View Logs
- Metrics : Railway > Metrics

### Frontend (Vercel)

- Logs : Vercel > Deployments > Functions Logs
- Analytics : Vercel > Analytics (activer si besoin)

### Database (Supabase)

- Logs : Supabase > Database > Logs
- Usage : Supabase > Settings > Usage

---

## 🔄 CI/CD (Déjà configuré)

**Auto-deploy activé** :

- Push sur `main` → déploiement automatique Railway + Vercel
- Pull request → Vercel crée un preview automatique

---

## 🛡️ Sécurité

### Secrets à ne JAMAIS commit

- ❌ `SUPABASE_SERVICE_ROLE_KEY`
- ❌ Passwords, tokens

### Variables publiques (safe)

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `NEXT_PUBLIC_API_URL`

### RLS Policies

- Les tables agent sont protégées par RLS
- Les utilisateurs ne peuvent lire que leurs propres données
- Le service_role (backend) a full access

---

## 🎯 Post-déploiement

### Checklist

- [ ] Supabase schemas exécutés
- [ ] Backend Railway déployé
- [ ] Frontend Vercel déployé
- [ ] Domaine custom configuré
- [ ] Test signup + login
- [ ] Test exercice complet
- [ ] Monitoring activé

### Optimisations futures

- CDN : Cloudflare devant Vercel
- Cache : Redis pour les exercices en cours
- DB : Index supplémentaires selon usage réel
- Analytics : Plausible ou Posthog

---

**Besoin d'aide ?** Contact : [ton email]

🚀 **Happy shipping!**
