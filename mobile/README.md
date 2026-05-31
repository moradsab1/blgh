# Balagh — Mobile Platform

Anonymous, privacy-first community safety reporting for mobile users. This folder contains both the React Native app and the Fastify backend that serves it.

```
mobile/
├── backend/          # Fastify API — anonymous, public-facing
│   └── README.md     # Full setup, API reference, deployment guide
├── frontend/
│   └── Balagh/       # React Native app (Expo-compatible, iOS + Android)
└── FrontendSpecs.md  # Mobile frontend architecture specification
```

---

## Backend (`mobile/backend`)

**Fastify 5 · PostgreSQL 16 + PostGIS · Drizzle ORM · Zod · WebSocket**

- Anonymous API — no accounts, no login. Every device is identified by a random hex `device_id` generated on-device and sent via `X-Device-Id`.
- Owns all database migrations and seeds. Both `mobile/backend` and `web/backend` share this database; only this service modifies the schema.
- Runs on **port 3000** by default.
- Incident geo-queries use PostGIS `ST_DWithin` with a generated `geom` column — no in-app distance loop for primary filtering.
- In-process EventEmitter bus handles WebSocket fan-out to mobile clients without any external broker.

**Key endpoints:** `POST /incidents`, `GET /incidents`, `POST /incidents/:id/vote`, `POST /incidents/:id/comments`, `GET /status`, `GET /localities`, `/ws` (realtime feed), admin resolve/hide behind a Bearer token.

→ See [`backend/README.md`](backend/README.md) for the full API reference and setup guide.

---

## Mobile App (`frontend/Balagh`)

**React Native · TypeScript · React Navigation · `@rnmapbox/maps` · React Query**

- Reports incidents by category (GUNFIRE, STABBING, ASSAULT, ROBBERY, SUSPICIOUS, OTHER) with optional free-text description.
- Real-time map view of nearby active incidents within a configurable radius.
- Safety status badge (calm / watch / active) updated live via WebSocket and REST polling.
- Notification inbox for nearby incidents and vote-verification alerts.
- Offline-safe incident submission via idempotency keys — reports queued locally are safely replayed without creating duplicates.
- Privacy-first: no analytics, no push tokens, no PII stored beyond a random device ID in `AsyncStorage`.

**Runs on:** iOS 15+ · Android 8+ (API 26+)

→ See [`frontend/FrontendSpecs.md`](frontend/FrontendSpecs.md) for the full specification.

---

## Quick Start

```bash
# 1. Start the shared database + run migrations
cd backend
docker compose up -d
npm install && npm run migrate && npm run seed
cp .env.example .env   # set ADMIN_TOKEN
npm run dev            # → http://localhost:3000

# 2. Run the mobile app (in a separate terminal)
cd ../frontend/Balagh
npm install
npx react-native start       # Metro bundler
npx react-native run-ios     # or run-android
```

The app connects to `http://localhost:3000` by default (configurable in `src/core/config.ts`).
