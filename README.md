# Balagh — Community Safety Platform

A privacy-first, anonymous community safety reporting platform for Arabic-speaking communities. Residents report incidents in real time; operators monitor and manage them through a web dashboard. All platforms share one PostgreSQL + PostGIS database.

---

## Repository Layout

```
blgh/
├── mobile/
│   ├── backend/        # Anonymous Fastify API (Node 22) — serves the mobile app
│   │   └── README.md   # Full API reference + development guide
│   └── frontend/
│       └── Balagh/     # React Native app (Expo)
└── web/
    ├── backend/        # Operator Fastify API (Node 22) — serves the dashboard
    │   └── README.md   # Full API reference + development guide
    ├── frontend/       # Operator dashboard (React + Vite)
    │   └── README.md   # Dashboard setup + env vars
    ├── WebBackendSpecs.md   # Architecture spec for web/backend
    └── WebFrontendSpecs.md  # Architecture spec for web/frontend
```

---

## Architecture

```
📱 Mobile app   ──────▶  mobile/backend  (Fastify, anonymous, port 3000)  ─┐
                                                                            ├──▶  PostgreSQL 16 + PostGIS 3.4
🖥️  Web dashboard  ────▶  web/backend    (Fastify, operator-gated, port 4000)  ─┘
```

Two independent backend services. **One shared database.** No message broker, no microservices, no queue.

- **`mobile/backend`** — public, anonymous. Any device can submit incidents, vote, comment, and subscribe to the WebSocket feed. Owns all schema migrations.
- **`web/backend`** — internal, operator-gated. Every endpoint requires a Bearer token. Provides a global read view of the shared database plus resolve/hide write operations. Never runs migrations.

---

## Quick Start (Development)

### Prerequisites

- Node.js 22+
- Docker (for the shared PostgreSQL + PostGIS database)

### 1 — Start the database

The `mobile/backend` directory contains the `docker-compose.yml`:

```bash
cd mobile/backend
docker compose up -d
npm install
npm run migrate      # creates all tables + PostGIS extension
npm run seed         # loads 18 locality records
```

### 2 — Start the mobile backend

```bash
# in mobile/backend/
cp .env.example .env
# edit .env — set ADMIN_TOKEN
npm run dev
# → http://localhost:3000
```

### 3 — Start the web backend

```bash
cd web/backend
cp .env.example .env
# edit .env — set OPERATOR_TOKEN and (optionally) DASHBOARD_ORIGIN
npm install
npm run dev
# → http://localhost:4000
```

### 4 — Start the web dashboard

```bash
cd web/frontend
cp .env.example .env
# .env.example already sets VITE_USE_MOCK=false and points to port 4000
npm install
npm run dev
# → http://localhost:5173
```

### 5 — Verify everything is running

```bash
curl http://localhost:3000/health   # {"ok":true,"db":"ok"}
curl http://localhost:4000/health   # {"ok":true,"db":"ok"}
```

---

## Shared Database

The database URL is the same in both `.env` files. `mobile/backend` is the **sole schema owner**:

| Responsibility | mobile/backend | web/backend |
|---|---|---|
| Run migrations | ✅ | ❌ never |
| Seed localities | ✅ | ❌ never |
| Read all tables | ✅ | ✅ |
| Insert incidents / votes / comments | ✅ | ❌ |
| Resolve / hide incidents | via `/admin/*` | via `/incidents/:id/{resolve,hide}` |

### Tables

| Table | Owner/writer | Purpose |
|---|---|---|
| `localities` | seed | 18 cities with Arabic/Hebrew/English names |
| `incidents` | mobile/backend | Reports with PostGIS `geom` column |
| `votes` | mobile/backend | Confirm/deny votes |
| `comments` | mobile/backend | Free-text comments + emoji identity tags |
| `devices` | mobile/backend | Last-known location per device |
| `notifications` | mobile/backend | Per-device inbox |
| `follow_ups` | mobile/backend | Structured follow-up detail |

---

## WebSocket Strategy

Each backend has its own **in-process EventEmitter bus**. There is no shared bus.

| Backend | WS endpoint | Who connects | What events are delivered |
|---|---|---|---|
| `mobile/backend` | `/ws` | Mobile app (per device, geo-subscribed) | `incident.created`, `vote.updated`, `status.changed`, `notification.new`, `incident.resolved` |
| `web/backend` | `/ws` | Operator dashboard (per operator session) | `incident.resolved`, `incident.hidden` |

**New incidents created in `mobile/backend` are not live-pushed to the dashboard.** The dashboard converges via a `refetchInterval` of 20 s on the incidents list. Postgres `LISTEN/NOTIFY` is the planned upgrade for true cross-process live push.

---

## Authentication Model

| Backend | Auth model | Token |
|---|---|---|
| `mobile/backend` | Anonymous — device ID only | `X-Device-Id` header (random hex, generated on device) |
| `web/backend` | Fully gated — Bearer token on every route | `Authorization: Bearer <OPERATOR_TOKEN>` |

The operator token is stored in `sessionStorage` in the browser — never `localStorage`, never a query string, never logged.

---

## Key Shared Constants

Both backends and both frontends mirror these constants. If you change one, update all four:

| Constant | Value | Meaning |
|---|---|---|
| `INCIDENT_RADIUS_KM` | 5 | Default incident fetch radius |
| `WATCH_RADIUS_KM` | 3 | Watch-state trigger radius |
| `ACTIVE_RADIUS_KM` | 1 | Active-state trigger radius |
| `WATCH_WINDOW_MIN` | 60 | Look-back window (minutes) for watch state |
| `ACTIVE_WINDOW_MIN` | 15 | Look-back window (minutes) for active state |
| `ACTIVE_THRESHOLD` | 3 | Minimum confirmed incidents to trigger active |

Files to keep in sync:
- `mobile/backend/src/lib/constants.ts`
- `web/backend/src/lib/constants.ts`
- `mobile/frontend/Balagh/src/core/config.ts`
- `web/frontend/src/lib/constants.ts` (if present)

---

## Further Reading

- [`mobile/backend/README.md`](mobile/backend/README.md) — Anonymous API reference, DB migrations, rate limits, deployment
- [`web/backend/README.md`](web/backend/README.md) — Operator API reference, filter contract, WS auth, deployment
- [`web/frontend/README.md`](web/frontend/README.md) — Dashboard setup, env vars, mock vs real mode
- [`web/WebBackendSpecs.md`](web/WebBackendSpecs.md) — Full architecture specification for `web/backend`
- [`web/WebFrontendSpecs.md`](web/WebFrontendSpecs.md) — Full specification for the operator dashboard
