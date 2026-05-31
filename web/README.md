# Balagh — Web Platform

Operator-facing dashboard and its dedicated backend. Internal tool — every endpoint and page requires an operator Bearer token.

```
web/
├── backend/             # Fastify API — operator-gated, reads the shared DB
│   └── README.md        # Full setup, API reference, deployment guide
├── frontend/            # React + Vite operator dashboard
│   └── README.md        # Setup, env vars, mock vs real mode
├── WebBackendSpecs.md   # Architecture specification for web/backend
└── WebFrontendSpecs.md  # Architecture specification for web/frontend
```

---

## Backend (`web/backend`)

**Fastify 5 · PostgreSQL 16 + PostGIS · Drizzle ORM · Zod · WebSocket**

- Connects to the **same database** as `mobile/backend` — never migrates or seeds.
- Every HTTP route requires `Authorization: Bearer <OPERATOR_TOKEN>` except `GET /health`.
- Returns a global `Incident[]` list (not geo-scoped by default) to match the dashboard's data needs.
- In-process WebSocket bus broadcasts resolve/hide events to all connected operator sessions.
- Runs on **port 4000** to avoid conflict with the mobile backend on 3000.

**Key endpoints:** `GET /incidents` (global, filterable), `GET /incidents/:id`, `GET /incidents/:id/comments`, `POST /incidents/:id/resolve`, `POST /incidents/:id/hide`, `GET /status`, `GET /localities`, `/ws` (operator realtime feed).

→ See [`backend/README.md`](backend/README.md) for the full API reference and setup guide.

---

## Frontend (`web/frontend`)

**React 18 · TypeScript · Vite · Tailwind CSS · TanStack Query · Leaflet**

- Locality-scoped map view with severity-coloured incident markers.
- Case triage rail with active / resolved / hidden tabs and severity filter chips.
- Detail drawer with comment thread and one-click resolve / hide actions.
- Safety status badge (calm / watch / active) per selected locality.
- Mock mode (`VITE_USE_MOCK=true`) for development without a running backend.
- Operator token stored in `sessionStorage` only — never `localStorage`, never a URL param.
- WebSocket auth via a `{type:"auth",token}` frame — token never in the URL.

→ See [`frontend/README.md`](frontend/README.md) for env vars, mock mode, and deployment.

---

## Quick Start

```bash
# 1. Ensure the shared database is running (start it from mobile/backend)
#    Then start the web backend:
cd backend
npm install
cp .env.example .env   # set DATABASE_URL (same as mobile/backend) and OPERATOR_TOKEN
npm run dev            # → http://localhost:4000

# 2. Start the dashboard (separate terminal)
cd ../frontend
npm install
cp .env.example .env   # already points to port 4000 with USE_MOCK=false
npm run dev            # → http://localhost:5173
```

Log in with the `OPERATOR_TOKEN` value set in `backend/.env`.

---

## Realtime Note

New incidents are created in `mobile/backend`'s process — they are not live-pushed to the operator dashboard. The dashboard converges via a **20-second polling interval** on the incidents list. Operator-initiated actions (resolve, hide) are pushed instantly to all connected operator WebSocket clients via the in-process bus.

Postgres `LISTEN/NOTIFY` is the planned upgrade for true cross-process live push without adding Redis.
