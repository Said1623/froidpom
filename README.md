# 🧊 Froidpom — Gestion Unité Frigorifique

Système complet de gestion d'une unité frigorifique : chambres froides, clients, réservations, entrées/sorties, paiements, location de caisses et tableaux de bord.

---

## 🏗 Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | NestJS 10.x + TypeORM 0.3.x |
| Base de données | PostgreSQL 13+ |
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| Auth | JWT (passport-jwt) |
| PDF | PDFKit |
| Styles | CSS Modules |

---

## 📁 Structure du projet

```
Froidpom/
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── auth/          — Authentification JWT
│       │   ├── chambres/      — CRUD chambres froides
│       │   ├── clients/       — CRUD clients
│       │   ├── reservations/  — Réservations + calcul montant
│       │   ├── entrees/       — Entrées stock (respect capacité)
│       │   ├── sorties/       — Sorties stock
│       │   ├── paiements/     — Paiements + balance
│       │   ├── locations/     — Location caisses + retours
│       │   ├── stock/         — Suivi par chambre / client
│       │   └── dashboard/     — Agrégats + PDF service
│       └── config/
│           └── data-source.ts
└── frontend/
    └── src/
        ├── components/
        │   ├── layout/        — Sidebar, AppLayout
        │   └── ui/            — Button, Card, Table, Modal…
        ├── hooks/             — useAuth, useFetch
        ├── pages/             — Une page par module
        ├── services/          — Appels API axios
        ├── types/             — Types TypeScript
        └── styles/            — globals.css (CSS variables)
```

---

## 🚀 Installation et démarrage

### Prérequis
- Node.js 18+
- PostgreSQL 13+

### 1. Créer la base de données

```sql
CREATE DATABASE froidpomme;
```

### 2. Backend

```bash
cd backend

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env : DB_HOST, DB_PASSWORD, JWT_SECRET

# Installer les dépendances
npm install

# Démarrage développement (synchronize: true crée les tables)
npm run start:dev
```

L'API démarre sur **http://localhost:3000/api**

> ℹ️ En mode `development`, TypeORM synchronise automatiquement le schéma.  
> Pour la production, utiliser les migrations : `npm run migration:generate` puis `npm run migration:run`

### 3. Frontend

```bash
cd frontend

npm install
npm run dev
```

Le frontend démarre sur **http://localhost:5173**

### 4. Créer le premier utilisateur

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","nom":"Administrateur"}'
```

Puis se connecter sur http://localhost:5173/login avec `admin` / `admin123`

---

## 🔌 API — Endpoints principaux

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion → JWT |
| POST | `/api/auth/register` | Créer un utilisateur |
| GET | `/api/auth/me` | Profil connecté |

### Chambres
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/chambres` | Liste des chambres |
| GET | `/api/chambres/stats` | Stats globales |
| POST | `/api/chambres` | Créer une chambre |
| PUT | `/api/chambres/:id` | Modifier |
| DELETE | `/api/chambres/:id` | Supprimer |

### Entrées / Sorties
- `POST /api/entrees` — Vérifie la capacité avant d'enregistrer
- `POST /api/sorties` — Vérifie le stock disponible avant d'enregistrer
- Suppression d'une entrée/sortie → annule automatiquement le mouvement de stock

### Locations
- `PUT /api/locations/:id/retour` — Enregistrer un retour de caisses

### Stock
- `GET /api/stock/chambres` — Stock par chambre
- `GET /api/stock/clients` — Stock par client (avec détail par chambre)
- `GET /api/stock/clients/:id` — Mouvements d'un client

### Dashboard
- `GET /api/dashboard` — Résumé complet (chambres, financier, locations, activité 30j)

---

## 🔒 Variables d'environnement

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=VOTRE_MOT_DE_PASSE
DB_DATABASE=froidpom
JWT_SECRET=CHANGEZ_CE_SECRET_EN_PRODUCTION
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
```

---

## 📊 Fonctionnalités

- ✅ **Chambres** : capacité max, température cible, taux de remplissage en temps réel
- ✅ **Clients** : CRUD complet avec recherche
- ✅ **Réservations** : caisses bois/plastique, prix unitaires, calcul automatique du total, statuts
- ✅ **Entrées** : contrôle de capacité avant enregistrement
- ✅ **Sorties** : contrôle du stock disponible avant enregistrement
- ✅ **Paiements** : multi-modes, balance total payé / reste à percevoir
- ✅ **Locations** : suivi des retours, alertes retard
- ✅ **Stock** : vue par chambre + vue par client avec détail
- ✅ **Dashboard** : KPIs, graphique activité 30j, taux de remplissage
- ✅ **PDF** : rapports stock, clients, paiements (service PDFKit)
- ✅ **JWT** : toutes les routes protégées

---

## 🖥 Déploiement production

```bash
# Backend
cd backend
npm run build
node dist/main

# Frontend
cd frontend
npm run build
# Servir le dossier dist/ avec nginx ou un CDN
```
