# Balagh Backend

Anonymous, privacy-first community safety reporting API.

**Stack:** Fastify 5 · PostgreSQL 16 + PostGIS 3.4 · Drizzle ORM · Zod · WebSocket (in-memory bus)

No Redis. No queue. No push service. No object storage. One process, one database.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [NPM Scripts](#npm-scripts)
- [Database](#database)
- [API Reference](#api-reference)
- [WebSocket](#websocket)
- [Authentication & Privacy](#authentication--privacy)
- [Error Responses](#error-responses)
- [Rate Limits](#rate-limits)
- [Development Guide](#development-guide)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Architecture Notes](#architecture-notes)

---

## Quick Start

### Prerequisites

- Node.js 22+
- Docker (for PostgreSQL + PostGIS)

```bash
# 1. Start the database
docker compose up -d

# 2. Install dependencies
npm install

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env — set DATABASE_URL and ADMIN_TOKEN

# 4. Run migrations
npm run migrate

# 5. Seed localities (18 cities)
npm run seed

# 6. Start the dev server
npm run dev
```

The server starts at `http://localhost:3000`. Verify with:

```bash
curl http://localhost:3000/health
# {"ok":true,"db":"ok"}

curl "http://localhost:3000/localities?q=nazareth"
# [{"id":"nazareth","nameAr":"الناصرة",...}]
```

---

## Project Structure

```
mobile/backend/
├── .env.example              # Template for required env vars
├── docker-compose.yml        # PostgreSQL + PostGIS (dev only)
├── drizzle.config.ts         # Drizzle-kit config
├── vitest.config.ts          # Test runner config
├── tsconfig.json             # TypeScript (strict, Node16, CommonJS)
├── BackendSpecs.md           # Full architecture specification
└── src/
    ├── server.ts             # Fastify bootstrap — HTTP + plugins + routes
    ├── config.ts             # Zod-validated env (throws at startup on bad config)
    ├── lib/
    │   ├── constants.ts      # Domain constants (mirrors frontend config.ts)
    │   ├── contracts.ts      # Wire types (mirrors frontend src/core/types/index.ts)
    │   ├── errors.ts         # AppError class + Fastify error handler
    │   ├── geo.ts            # haversineKm() — ported from frontend MockStatusRepo
    │   └── identity.ts       # deriveEmojis() — ported from frontend identity
    ├── db/
    │   ├── client.ts         # Drizzle + pg Pool (TIMESTAMPTZ → ISO strings)
    │   ├── schema.ts         # Drizzle schema for all 7 tables
    │   ├── migrate.ts        # Custom migration runner (tracks via _migrations table)
    │   ├── seed.ts           # Seeds 18 Arabic/Hebrew/English locality names
    │   └── migrations/
    │       ├── 0000_initial.sql   # All tables, PostGIS extension, GIN/GiST indexes
    │       └── 0001_add_ref_seq.sql  # Sequence for BLG-XXXXXX incident refs
    ├── modules/
    │   ├── incidents/
    │   │   ├── routes.ts     # GET/POST /incidents, votes, comments
    │   │   └── service.ts    # Geo queries, idempotency, notification fan-out
    │   ├── status/
    │   │   ├── routes.ts     # GET /status
    │   │   └── service.ts    # calculateStatus() — pure + DB-backed getStatus()
    │   ├── localities/
    │   │   └── routes.ts     # GET /localities?q= (trigram search)
    │   ├── notifications/    # Phase 4 — GET /notifications, mark-read
    │   ├── followups/        # Phase 4 — POST /follow-up/:ref
    │   └── admin/            # Phase 3 — hide / resolve (bearer token)
    └── realtime/
        └── ws.ts             # Phase 3 — /ws WebSocket handler
test/
└── unit/
    ├── geo.test.ts           # haversineKm correctness
    ├── identity.test.ts      # deriveEmojis determinism
    └── status.test.ts        # calculateStatus scenarios + SEVERITY_MAP
```

---

## Environment Variables

All variables are validated at startup via Zod. The process exits immediately if a required variable is missing.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `ADMIN_TOKEN` | yes | — | Bearer token for `POST /admin/*` routes |
| `PORT` | no | `3000` | HTTP listen port |
| `MIN_APP_VERSION` | no | `1.0.0` | Minimum accepted `X-App-Version` header (426 gate) |
| `LOG_LEVEL` | no | `info` | Pino log level (`trace` / `debug` / `info` / `warn` / `error` / `fatal`) |

Example `.env`:

```bash
DATABASE_URL=postgresql://balagh:balagh@localhost:5432/balagh
PORT=3000
ADMIN_TOKEN=super-secret-change-this
MIN_APP_VERSION=1.0.0
LOG_LEVEL=info
```

---

## NPM Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start server with `tsx watch` (hot-reload on file save) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run typecheck` | Type-check without emitting files (`tsc --noEmit`) |
| `npm run migrate` | Apply pending SQL migrations from `src/db/migrations/` |
| `npm run seed` | Insert the 18 seed localities (idempotent — safe to re-run) |
| `npm test` | Run unit tests with Vitest |
| `npm run lint` | ESLint on `src/` |

---

## Database

### PostgreSQL + PostGIS

The `docker-compose.yml` starts `postgis/postgis:16-3.4` on port 5432. PostGIS and `pg_trgm` extensions are enabled by the first migration.

```bash
# Start / stop
docker compose up -d
docker compose down

# Connect with psql
psql postgresql://balagh:balagh@localhost:5432/balagh
```

### Migrations

Migrations live in `src/db/migrations/` as plain `.sql` files, applied in alphabetical order. A `_migrations` table tracks which files have been applied — re-running `npm run migrate` is safe.

```
0000_initial.sql        — all tables, extensions, indexes
0001_add_ref_seq.sql    — incident_ref_seq (BLG-XXXXXX ref generation)
```

### Schema overview

| Table | Purpose |
|---|---|
| `localities` | 18 seed cities — id, Arabic/Hebrew/English names, lat/lng |
| `incidents` | Reports — includes `geom GEOGRAPHY(Point)` generated from lat/lng |
| `votes` | Confirm/deny votes — `UNIQUE(incident_id, device_id)` |
| `comments` | Free-text comments with 3-emoji identity tag |
| `devices` | Last-known location per device (for notification fan-out) |
| `notifications` | Per-device notification inbox |
| `follow_ups` | Structured follow-up detail after an incident |

The `incidents.geom` column is a **PostgreSQL generated stored column** derived from `(lng, lat)`. It is never written by the application — Postgres maintains it automatically. All geo queries use `ST_DWithin(geom, ..., meters)` with a GiST index.

### PostGIS query pattern

```sql
-- Incidents within 5 km of a point
SELECT * FROM incidents
WHERE ST_DWithin(
  geom,
  ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
  5000   -- metres
)
AND NOT hidden AND resolved_at IS NULL;
```

---

## API Reference

All endpoints return JSON. Every mutating request (POST, PATCH) should include the `Content-Type: application/json` header.

### Headers

| Header | Required on | Description |
|---|---|---|
| `X-Device-Id` | all write routes + status/incidents | 32-byte random hex string identifying the device |
| `X-App-Version` | optional | Semver string; 426 returned if below `MIN_APP_VERSION` |
| `Authorization` | `/admin/*` only | `Bearer <ADMIN_TOKEN>` |

### `GET /health`

Liveness check. Runs `SELECT 1` to verify DB connectivity.

```json
{ "ok": true, "db": "ok" }
```

---

### Localities

#### `GET /localities`

Search or list all cities.

| Query param | Type | Description |
|---|---|---|
| `q` | string (optional) | Trigram ILIKE search across Arabic, Hebrew, and English names |

Returns `Locality[]`. Empty or absent `q` returns all 18 cities.

```bash
curl "http://localhost:3000/localities"
curl "http://localhost:3000/localities?q=haifa"
curl "http://localhost:3000/localities?q=حيفا"
```

```json
[
  {
    "id": "haifa",
    "nameAr": "حيفا",
    "nameHe": "חיפה",
    "nameEn": "Haifa",
    "lat": 32.794,
    "lng": 34.9896
  }
]
```

---

### Incidents

#### `GET /incidents`

Geo-filtered list of active (non-hidden, non-resolved) incidents.

| Query param | Type | Constraints |
|---|---|---|
| `lat` | number | -90 to 90 |
| `lng` | number | -180 to 180 |
| `radiusKm` | number | 0.1 to 10 |

`myVote` is resolved per device from the `votes` table using `X-Device-Id`.

```bash
curl -H "X-Device-Id: abc123..." \
  "http://localhost:3000/incidents?lat=32.51&lng=35.15&radiusKm=5"
```

```json
[
  {
    "id": "uuid",
    "ref": "BLG-2S0000",
    "category": "ASSAULT",
    "severity": "high",
    "lat": 32.51,
    "lng": 35.15,
    "localityId": "umm-al-fahm",
    "createdAt": "2024-06-01T10:00:00.000Z",
    "confirmations": 3,
    "denials": 0,
    "commentCount": 1,
    "myVote": null
  }
]
```

#### `GET /incidents/:id`

Single incident with `myVote` resolved. Returns `404` if hidden.

#### `POST /incidents`

Submit a new incident report.

```json
{
  "category": "ASSAULT",
  "lat": 32.51,
  "lng": 35.15,
  "description": "optional text, max 280 chars",
  "idempotencyKey": "client-generated-uuid"
}
```

Valid categories: `GUNFIRE` · `STABBING` · `ASSAULT` · `ROBBERY` · `SUSPICIOUS` · `OTHER`

Severity is derived automatically: `GUNFIRE/STABBING → critical`, `ASSAULT/ROBBERY → high`, `SUSPICIOUS/OTHER → medium`.

`idempotencyKey` is optional but recommended for offline-replay safety. Submitting the same key twice returns the original `{id, ref}` without creating a duplicate.

**Response 201:**
```json
{ "id": "uuid", "ref": "BLG-2S0000" }
```

**Side effects:**
- Nearby devices (within `WATCH_RADIUS_KM` = 3 km) receive a `notifications` row
- WebSocket clients in range receive `incident.created` event (Phase 3)

#### `POST /incidents/:id/vote`

Cast a confirm or deny vote.

```json
{ "vote": "confirm" }
```

One vote per device per incident. Returns `409 DUPLICATE_VOTE` if already voted.

**Response 200:** Updated `Incident` object with `myVote` set.

#### `GET /incidents/:id/comments`

Returns `Comment[]` ordered oldest-first.

```json
[
  {
    "id": "uuid",
    "incidentId": "uuid",
    "identityTag": ["🦁", "🌙", "🎯"],
    "body": "رأيت سيارة بيضاء",
    "createdAt": "2024-06-01T10:05:00.000Z"
  }
]
```

The `identityTag` (3-emoji array) is derived deterministically from the commenter's `X-Device-Id` using `deriveEmojis()` — the same algorithm as the frontend. It never exposes the raw device ID.

#### `POST /incidents/:id/comments`

Add a comment to an incident.

```json
{ "body": "text up to 280 characters" }
```

**Response 201:** `Comment` object.

---

### Status

#### `GET /status`

Compute the current safety state for a location.

| Query param | Type | Constraints |
|---|---|---|
| `lat` | number | -90 to 90 |
| `lng` | number | -180 to 180 |

**Side effect:** upserts the device's last-known location (used for notification fan-out on future incident reports).

**Response 200:**
```json
{ "state": "calm", "reason": "no_nearby_incidents" }
```

States and their rules (constants match the frontend exactly):

| State | Condition |
|---|---|
| `active` | ≥ 3 confirmed incidents (`confirmations ≥ 1`) within 1 km and 15 min |
| `watch` | ≥ 1 incident within 3 km and 60 min |
| `calm` | Neither of the above |

---

### Notifications *(Phase 4)*

#### `GET /notifications`

Returns all notifications for the requesting device, newest first.

#### `POST /notifications/read`

```json
{ "ids": ["uuid", "uuid"] }
```

Mark specific notifications as read. **Response 204.**

#### `POST /notifications/read-all`

Mark all device notifications as read. **Response 204.**

---

### Follow-ups *(Phase 4)*

#### `POST /follow-up/:ref`

Submit optional structured detail after an incident.

```json
{
  "vehicle":    "yes",
  "assailants": "2",
  "direction":  "north",
  "weapon":     "no"
}
```

All fields optional. Allowed values:
- `vehicle`: `"yes"` | `"no"`
- `assailants`: `"1"` | `"2"` | `"3+"`
- `direction`: `"north"` | `"south"` | `"east"` | `"west"`
- `weapon`: `"yes"` | `"no"`

**Response 201:** `{ "ok": true }`

---

### Admin

All admin routes require `Authorization: Bearer <ADMIN_TOKEN>`.

#### `POST /admin/incidents/:id/resolve`

Mark an incident as resolved (`resolved_at = now()`). Excluded from future `GET /incidents` results.

#### `POST /admin/incidents/:id/hide`

Hide an incident (`hidden = true`). Excluded from all lists and WS broadcasts.

**Both:** Response 200 `{ "ok": true }` · 401 on wrong token · 404 if not found.

---

## WebSocket

*(Implemented in Phase 3)*

Connect at `ws://localhost:3000/ws` (or `wss://` in production).

After connecting, send a subscription frame to start receiving events:

```json
{ "type": "subscribe", "lat": 32.51, "lng": 35.15, "radiusKm": 5 }
```

The server broadcasts five event types:

| Event | When | Filter |
|---|---|---|
| `{ t: "incident.created", incident }` | New incident submitted | Within subscriber's radius |
| `{ t: "incident.resolved", id }` | Admin resolves an incident | All subscribers |
| `{ t: "status.changed", state, reason }` | Status changes after vote | All subscribers |
| `{ t: "vote.updated", id, confirmations, denials }` | Vote cast | Within incident radius |
| `{ t: "notification.new", notification }` | New notification | Targeted by device ID |

Re-send `subscribe` at any time to update your geo position. The server pings every 30 s; connections silent for 90 s are closed.

---

## Authentication & Privacy

This service is **anonymous by design**:

- No user accounts, no email, no phone number, no personal data stored.
- Every device generates a random 32-byte hex `device_id` locally (see frontend `src/core/identity/index.ts`). It is sent in the `X-Device-Id` header.
- The `device_id` is stored in the `devices` table only as a location anchor for notification fan-out. It is never linked to a real person.
- IP addresses are used transiently for in-memory rate limiting and are never persisted.
- No police or state agency integration — not now, not ever.

**Optional future hardening:** the frontend already has a `signRequest()` stub for HMAC-SHA256 request signing. When wired up, each request can carry an `X-Signature` and `X-Timestamp` header derived from the device key, allowing the server to reject replayed or spoofed requests.

---

## Error Responses

All errors use a consistent envelope:

```json
{ "code": "NOT_FOUND", "message": "Incident not found" }
```

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing/invalid request field |
| 401 | `UNAUTHORIZED` | Missing or wrong `ADMIN_TOKEN` |
| 404 | `NOT_FOUND` | Resource not found or hidden |
| 409 | `DUPLICATE_VOTE` | Device already voted on this incident |
| 409 | `DUPLICATE_REPORT` | `idempotencyKey` already used |
| 426 | `UPDATE_REQUIRED` | `X-App-Version` below `MIN_APP_VERSION` |
| 429 | `RATE_LIMITED` | Too many requests from this IP |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Rate Limits

In-memory per-IP limits via `@fastify/rate-limit`. Configured in Phase 5 (currently global 100 req/min).

| Route | Limit |
|---|---|
| `POST /incidents` | 5 / min |
| `POST /incidents/:id/vote` | 20 / min |
| `POST /incidents/:id/comments` | 10 / min |
| All other routes | 100 / min |

---

## Development Guide

### Adding a new route

1. Create (or update) a `routes.ts` file in `src/modules/<module>/`.
2. Export a `FastifyPluginAsync` default function.
3. Register it in `src/server.ts` with `await app.register(yourRoutes)`.

### Adding a new migration

1. Create `src/db/migrations/000N_description.sql` (alphabetical order matters).
2. Run `npm run migrate` — the runner skips already-applied files.

### Key domain constants

All constants are in `src/lib/constants.ts` and must match `mobile/frontend/Balagh/src/core/config.ts`:

```ts
INCIDENT_RADIUS_KM = 5   // default fetch radius
WATCH_RADIUS_KM    = 3   // watch-state + notification fan-out radius
ACTIVE_RADIUS_KM   = 1   // active-state radius
WATCH_WINDOW_MIN   = 60  // look-back window for watch
ACTIVE_WINDOW_MIN  = 15  // look-back window for active
ACTIVE_THRESHOLD   = 3   // min verified incidents to trigger active
```

### Connecting the frontend

In `mobile/frontend/Balagh/src/core/config.ts`, flip the flag and point to this server:

```ts
export const USE_MOCK_API = false;
export const API_BASE_URL = 'http://localhost:3000';   // dev
export const WS_URL       = 'ws://localhost:3000/ws';  // dev
```

Every frontend repository method maps directly to a backend route — see `BackendSpecs.md §7.10` for the full traceability matrix.

---

## Testing

```bash
# Run all tests
npm test

# Watch mode (re-runs on file change)
npx vitest
```

Current unit tests (`test/unit/`):

| File | Coverage |
|---|---|
| `geo.test.ts` | `haversineKm` — distance accuracy, symmetry, zero case |
| `identity.test.ts` | `deriveEmojis` — determinism, different inputs, palette bounds |
| `status.test.ts` | `calculateStatus` — calm/watch/active scenarios, edge cases; `SEVERITY_MAP` values |

Unit tests mock `src/db/client` so no database is required to run them.

Integration tests (planned in Phase 5) will use Testcontainers to spin up a real PostGIS instance.

---

## Production Deployment

### 1. Provision a managed PostgreSQL with PostGIS

Enable the PostGIS extension on your managed DB, then:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/balagh \
npm run migrate

DATABASE_URL=postgresql://user:pass@host:5432/balagh \
npm run seed
```

### 2. Build and start

```bash
npm run build
NODE_ENV=production node dist/server.js
```

Or with a process manager:

```bash
npm install -g pm2
pm2 start dist/server.js --name balagh-backend
pm2 save
```

### 3. Docker *(Phase 5)*

A multi-stage Dockerfile is planned for Phase 5. For now, build the JS bundle and run with Node directly.

### 4. Environment

Set all required env vars (see [Environment Variables](#environment-variables)). In production:

- `ADMIN_TOKEN` — use a cryptographically random secret (e.g. `openssl rand -hex 32`)
- `LOG_LEVEL=warn` or `error` to reduce log volume
- Put TLS termination at the load balancer / Nginx — the app serves plain HTTP/WS

### 5. Health check

Wire `GET /health` to your load balancer or container liveness check. It returns 200 when the server is up and the DB is reachable.

### Smoke-test checklist

```bash
BASE=https://api.your-domain.com

curl $BASE/health
# {"ok":true,"db":"ok"}

curl "$BASE/localities" | jq 'length'
# 18

curl -X POST $BASE/incidents \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: $(openssl rand -hex 32)" \
  -d '{"category":"SUSPICIOUS","lat":32.51,"lng":35.15}'
# {"id":"...","ref":"BLG-..."}

curl -H "X-Device-Id: $(openssl rand -hex 32)" \
  "$BASE/incidents?lat=32.51&lng=35.15&radiusKm=5" | jq '.[0].ref'
# "BLG-..."

curl -H "X-Device-Id: $(openssl rand -hex 32)" \
  "$BASE/status?lat=32.51&lng=35.15"
# {"state":"watch","reason":"incident_nearby"}
```

---

## Architecture Notes

### Why single process?

At MVP scale a single Fastify process is far simpler to deploy, reason about, and debug than a multi-process architecture. The in-memory EventEmitter handles WebSocket fan-out without any external broker. If the app needs to scale to multiple instances, swap the bus for Redis pub/sub — the broadcast function signature stays identical.

### Why PostGIS instead of in-app filtering?

The `geom GEOGRAPHY(Point, 4326)` stored column + GiST index lets Postgres evaluate `ST_DWithin` at the storage engine level, pushing geo filtering into the query planner. For the status computation, data is pre-filtered in SQL then refined with `haversineKm` in application code — this matches the frontend's algorithm exactly while still avoiding a full table scan.

### Why no ORM for geo queries?

Drizzle ORM is used for schema types, inserts, and simple selects. Geo queries (`ST_DWithin`, `ST_MakePoint`) use raw `pool.query()` calls because Drizzle has no built-in PostGIS dialect. This is deliberate — raw SQL is more readable for PostGIS than any generated wrapper.

### What is deferred

| Feature | Deferred until |
|---|---|
| WebSocket `/ws` + in-memory bus | Phase 3 |
| Notification inbox + follow-ups | Phase 4 |
| Tuned rate limits + 426 gate + Docker + CI | Phase 5 |
| Redis pub/sub (multi-instance) | When scale requires it |
| FCM/APNs push | When push is needed |
| Request signing (HMAC) | When fraud is a concern |
