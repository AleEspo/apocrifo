# 🎮 Apocrifo - Party Game MVP

Party game multiplayer sincrono basato su bluff di definizioni in stile "dizionario antico".

## 🚀 Quick Start

### Prerequisiti
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (o usa Docker)

### Setup con Docker (Raccomandato)

```bash
# Clone repo
git clone <your-repo-url>
cd apocrifo

# Setup environment
cp .env.example .env
# Modifica .env con i tuoi valori

# Avvia tutto
docker-compose up --build

# In un altro terminale, setup database
docker-compose exec backend npx prisma migrate dev --name init
docker-compose exec backend npx prisma db seed
```

### Setup Manuale

```bash
# Backend
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev

# Frontend (nuovo terminale)
cd frontend
npm install
npm run dev
```

## 📦 Accesso

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/api/docs

## 🎨 Design System

Il progetto utilizza un design system basato su dizionario ottocentesco:
- Tipografia: Playfair Display + Crimson Text (serif)
- Palette: pergamena, seppia, inchiostro
- Ornamenti vintage e cornici decorative

## 🏗️ Architettura

- **Backend**: NestJS + TypeScript + Socket.IO
- **Frontend**: React + Vite + TypeScript
- **Database**: PostgreSQL + Prisma
- **Auth**: JWT + OAuth (Google, Apple)
- **Real-time**: WebSocket rooms

## 📚 Documentazione

Vedi `ARCHITECTURE.md` per dettagli completi su:
- Modello dati
- State machine
- API endpoints
- Eventi WebSocket

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e

# Frontend tests
cd frontend
npm run test
```

## 🚢 Deploy

Il progetto è configurato per deploy su:
- Railway
- Render
- Fly.io

Vedi `docs/deployment.md` per guide dettagliate.

## 📝 License

MIT
