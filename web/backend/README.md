# Balagh Web Backend — Operator API

Operator-gated Fastify service that connects to the **shared PostgreSQL + PostGIS database** managed by `mobile/backend`. Every endpoint requires a Bearer token. The service never runs migrations or seeds — `mobile/backend` owns the schema.

**Stack:** Fastify 5 · PostgreSQL 16 + PostGIS 3.4 · Drizzle ORM · Zod · `@fastify/websocket` · TypeScript 5 · Node.js 22

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [NPM Scripts](#npm-scripts)
- [API Reference](#api-reference)
  - [Health](#health)
  - [Localities](#localities)
  - [Incidents](#incidents)
  - [Status](#status)
  - [WebSocket](#websocket)
- [Authentication](#authentication)
- [Error Responses](#error-responses)
- [Realtime — Limitations & Upgrade Path](#realtime--limitations--upgrade-path)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Shared Contract Files](#shared-contract-files)

---

## Quick Start

### Prerequisites

- Node.js 22+
- The shared database already running (start it via `mobile/backend` — see root README)

```bash
# 1. Install dependencies
npm install

# 2. Copy and edit env vars
cp .env.example .env
# Required: DATABASE_URL (same as mobile/backend), OPERATOR_TOKEN

# 3. Start dev server
npm run dev
# → http://localhost:4000
```

Verify:

```bash
curl http://localhost:4000/health
# {"ok":true,"db":"ok"}

curl -H "Authorization: Bearer <your-token>" \
  http://localhost:4000/localities
# [{"id":"haifa","nameAr":"حيفا",...}]
```

---

## Architecture

```
📱 Mobile app   ──────▶  mobile/backend  (port 3000, anonymous)  ─┐
                                                                   ├──▶  PostgreSQL 16 + PostGIS
🖥️  Dashboard   ──────▶  web/backend     (port 4000, operator)   ─┘
```

- **Two independent services, one shared database.** No message broker, no Redis, no queue.
- `mobile/backend` owns all schema migrations. This service reads the shared tables and writes only to `incidents` (resolve/hide).
- The operator WS bus is **in-process only** — new incidents created in `mobile/backend` are not pushed live. The dashboard polls every 20 s for new data.
- Postgres `LISTEN/NOTIFY` is the documented upgrade path for true cross-process live push.

---

## Project Structure

```
web/backend/
├── .env.example
├── drizzle.config.ts       # drizzle-kit config (schema introspection / studio)
├── package.json
├── tsconfig.json           # strict, Node16, CommonJS
├── vitest.config.ts
└── src/
    ├── server.ts           # Fastify bootstrap + global auth hook + plugin registration
    ├── config.ts           # Zod-validated env — throws at startup on bad config
    ├── db/
    │   ├── client.ts       # pg Pool + Drizzle; TIMESTAMPTZ → ISO strings; NO migrate
    │   └── schema.ts       # Drizzle schema mirrored from mobile/backend — keep in sync
    ├── lib/
    │   ├── auth.ts         # operatorAuthHook (global preHandler) + requireOperatorToken
    │   ├── contracts.ts    # Wire types — mirror of mobile/backend/src/lib/contracts.ts
    │   ├── constants.ts    # Domain constants — mirror of mobile/backend/src/lib/constants.ts
    │   ├── errors.ts       # AppError class + Fastify errorHandler
    │   ├── events.ts       # In-process EventEmitter bus + operatorSockets Set
    │   ├── geo.ts          # haversineKm() — mirror of mobile/backend
    │   └── identity.ts     # deriveEmojis() — mirror of mobile/backend
    ├── modules/
    │   ├── incidents/
    │   │   ├── routes.ts   # GET/POST incident endpoints
    │   │   └── service.ts  # listIncidents (dynamic WHERE builder), resolve, hide
    │   ├── localities/
    │   │   └── routes.ts   # GET /localities?q= (trigram ILIKE)
    │   └── status/
    │       ├── routes.ts   # GET /status?lat&lng
    │       └── service.ts  # calculateStatus (pure, ported) + getStatus
    └── realtime/
        └── ws.ts           # /ws — auth frame, operator broadcast, keepalive
test/
└── unit/
    ├── geo.test.ts
    ├── identity.test.ts
    ├── incidents-filters.test.ts
    └── status.test.ts
```

---

## Environment Variables

All variables are validated at process startup via Zod. The process exits immediately on any missing or invalid value.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection string — **same DB as `mobile/backend`** |
| `OPERATOR_TOKEN` | yes | — | Bearer token required on every request (except `/health`) |
| `PORT` | no | `4000` | HTTP/WS listen port |
| `DASHBOARD_ORIGIN` | no | `http://localhost:5173` | Allowed CORS origin — **never use `*` in production** |
| `LOG_LEVEL` | no | `info` | Pino log level: `trace` · `debug` · `info` · `warn` · `error` · `fatal` |

Example `.env`:

```bash
DATABASE_URL=postgresql://balagh:balagh@localhost:5432/balagh
OPERATOR_TOKEN=change-this-secret
PORT=4000
DASHBOARD_ORIGIN=https://dashboard.yourdomain.com
LOG_LEVEL=info
```

---

## NPM Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start with `tsx watch` — hot-reloads on file change |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run typecheck` | Type-check without emitting (`tsc --noEmit`) |
| `npm test` | Run unit tests with Vitest |
| `npm run lint` | ESLint on `src/` |

> **No `migrate` or `seed` scripts.** This service never modifies the schema. Run migrations from `mobile/backend`.

---

## API Reference

All endpoints except `GET /health` require:

```
Authorization: Bearer <OPERATOR_TOKEN>
```

All successful responses are `application/json`. Errors use a `{ code, message }` envelope — see [Error Responses](#error-responses).

---

### Health

#### `GET /health`

Liveness check. The **only ungated route** — no Authorization header needed.

Runs `SELECT 1` to verify database connectivity.

```bash
curl http://localhost:4000/health
```

```json
{ "ok": true, "db": "ok" }
```

---

### Localities

#### `GET /localities?q=`

Search or list all cities.

| Parameter | Type | Description |
|---|---|---|
| `q` | string (optional) | Trigram ILIKE search — matches Arabic, Hebrew, and English names |

Returns `Locality[]`. Empty or absent `q` returns all localities ordered alphabetically.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/localities?q=haifa"
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

Global incident list with optional filters. Returns `Incident[]` — **no pagination envelope**, exactly matching the dashboard's `api.get<Incident[]>('/incidents?…')` call.

`myVote` is always `null` — the operator backend has no voting identity.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | `active` \| `resolved` \| `hidden` \| `all` | `active` | Status filter |
| `severity` | CSV string | — | Comma-separated: `critical,high,medium,low` |
| `category` | CSV string | — | Comma-separated: `GUNFIRE,STABBING,ASSAULT,ROBBERY,SUSPICIOUS,OTHER` |
| `localityId` | string | — | Exact match on `locality_id` |
| `bbox` | `minLng,minLat,maxLng,maxLat` | — | PostGIS `ST_MakeEnvelope` bounding box filter |
| `since` | ISO 8601 datetime | — | Only incidents created at or after this timestamp |
| `lat` | number | — | Geo-scope latitude (requires `lng` and `radiusKm`) |
| `lng` | number | — | Geo-scope longitude (requires `lat` and `radiusKm`) |
| `radiusKm` | number | — | Radius in km for geo-scope (requires `lat` and `lng`) |

**Status filter SQL mapping:**

| `status` | Predicate |
|---|---|
| `active` (default) | `hidden = false AND resolved_at IS NULL` |
| `resolved` | `resolved_at IS NOT NULL` |
| `hidden` | `hidden = true` |
| `all` | *(no predicate — returns everything)* |

Results are ordered `created_at DESC, id DESC`.

```bash
# All active incidents globally
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/incidents"

# Active critical incidents in a bounding box
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/incidents?status=active&severity=critical&bbox=34.8,31.7,35.3,32.1"

# Resolved incidents near Haifa in the last 24 h
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/incidents?status=resolved&lat=32.794&lng=34.9896&radiusKm=5&since=2025-01-01T00:00:00Z"
```

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "ref": "BLG-000001",
    "category": "ASSAULT",
    "severity": "high",
    "description": "optional text",
    "lat": 32.51,
    "lng": 35.15,
    "localityId": "umm-al-fahm",
    "createdAt": "2025-01-01T10:00:00.000Z",
    "confirmations": 3,
    "denials": 0,
    "commentCount": 1,
    "myVote": null
  }
]
```

#### `GET /incidents/:id`

Single incident by UUID. Returns `404` if the incident does not exist.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/incidents/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

#### `GET /incidents/:id/comments`

All comments for an incident, oldest first.

```json
[
  {
    "id": "uuid",
    "incidentId": "uuid",
    "identityTag": ["🦁", "🌙", "🎯"],
    "body": "رأيت سيارة بيضاء",
    "createdAt": "2025-01-01T10:05:00.000Z"
  }
]
```

The `identityTag` is a 3-emoji tuple derived deterministically from the commenter's device ID — it never exposes the raw device ID.

#### `POST /incidents/:id/resolve`

Mark an incident as resolved. Sets `resolved_at = now()`. The incident disappears from the default `status=active` list.

Broadcasts `{ t: "incident.resolved", id }` to all connected operator WebSocket clients.

Returns `204 No Content`. Returns `404` if the incident does not exist or is already resolved.

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/incidents/3fa85f64-5717-4562-b3fc-2c963f66afa6/resolve
```

#### `POST /incidents/:id/hide`

Hide an incident (`hidden = true`). Excluded from all active/resolved lists.

Broadcasts `{ t: "incident.hidden", id }` to all connected operator WebSocket clients.

Returns `204 No Content`. Returns `404` if the incident does not exist.

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/incidents/3fa85f64-5717-4562-b3fc-2c963f66afa6/hide
```

---

### Status

#### `GET /status?lat=&lng=`

Compute the safety state for a geographic point. Uses the same `calculateStatus()` algorithm as `mobile/backend` so both platforms always report identical states.

**Unlike `mobile/backend`**, this endpoint has **no side effects** — it does not upsert device location.

| Parameter | Type | Required |
|---|---|---|
| `lat` | number (-90 to 90) | yes |
| `lng` | number (-180 to 180) | yes |

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/status?lat=32.794&lng=34.9896"
```

```json
{ "state": "watch", "reason": "incident_nearby" }
```

**States:**

| State | Condition |
|---|---|
| `active` | ≥ 3 confirmed incidents (`confirmations ≥ 1`) within 1 km and 15 min |
| `watch` | ≥ 1 incident within 3 km and 60 min |
| `calm` | Neither |

---

### WebSocket

#### `WS /ws`

Operator real-time feed. Delivers resolve/hide events broadcast by this process.

**Auth:** Unlike the HTTP routes, `/ws` is excluded from the global Bearer hook. Authentication is performed via an **auth frame** — the token never appears in the URL.

**Connection sequence:**

```
client → server   CONNECT  ws://localhost:4000/ws
server → client   (connection open, awaiting auth)

client → server   {"type":"auth","token":"<OPERATOR_TOKEN>"}
server → client   {"type":"auth_ok"}

server → client   {"type":"ping"}        (every 30 s)
client → server   {"type":"pong"}

server → client   {"t":"incident.resolved","id":"uuid"}  (on POST …/resolve)
server → client   {"t":"incident.hidden","id":"uuid"}     (on POST …/hide)
```

If the token is wrong:
```
server → client   CLOSE 4001 "Unauthorized"
```

If no message is received for 90 s:
```
server → client   CLOSE 4000 "Keepalive timeout"
```

**Events delivered:**

| Event | When emitted |
|---|---|
| `{ t: "incident.resolved", id }` | `POST /incidents/:id/resolve` succeeds |
| `{ t: "incident.hidden", id }` | `POST /incidents/:id/hide` succeeds |

> **New incidents are NOT pushed via WS.** They originate in `mobile/backend`'s process. The dashboard uses a 20 s `refetchInterval` on the incidents list to pick them up. See [Realtime — Limitations & Upgrade Path](#realtime--limitations--upgrade-path).

---

## Authentication

A global `onRequest` hook (`src/lib/auth.ts`) runs before every route handler. It requires:

```
Authorization: Bearer <OPERATOR_TOKEN>
```

Exceptions:
- `GET /health` — always public (liveness check for load balancers)
- `GET/WS /ws` — auth handled inside the WS handler via the first message frame

If the token is missing or wrong, the server returns:

```json
HTTP 401
{ "code": "UNAUTHORIZED", "message": "Unauthorized" }
```

**Security constraints:**
- The token must be stored in `sessionStorage` in the browser — never `localStorage`, never a cookie, never a URL query parameter.
- WS token is sent in a JSON frame (`{"type":"auth","token":"…"}`), never in the WebSocket URL.
- CORS is restricted to `DASHBOARD_ORIGIN` — never `*` in production.

---

## Error Responses

All errors use a consistent envelope:

```json
{ "code": "NOT_FOUND", "message": "Incident not found" }
```

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid query parameter or malformed request |
| 401 | `UNAUTHORIZED` | Missing or wrong `OPERATOR_TOKEN` |
| 404 | `NOT_FOUND` | Resource does not exist |
| 429 | `RATE_LIMITED` | Too many requests (200 req/min per IP) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Realtime — Limitations & Upgrade Path

### Current (per-process bus)

This service maintains an in-memory `Set<WebSocket>` of authenticated operator sockets. When an operator resolves or hides an incident, all other operators connected to **this process** see the update instantly.

**Limitation:** New incidents are created by `mobile/backend`. They live in a different process and use a different in-memory bus. They are **not pushed** to operator WS clients.

**Mitigation:** The dashboard uses `refetchInterval: 20_000` (20 s) on the incidents list query so new incidents appear within 20 s.

### Upgrade — Postgres LISTEN/NOTIFY

Add a trigger on `incidents INSERT` that calls `pg_notify('incidents_channel', row_to_json(NEW)::text)`. Both backends `LISTEN` on the channel and push to their respective WS clients. No Redis, no new infra — just a DB trigger and a `pg.Client` in each process for the persistent listen connection.

### Upgrade — Redis pub/sub (multi-instance)

Replace the `operatorSockets` broadcast with a Redis pub/sub channel. All instances subscribe; only the instance holding a socket sends the WS frame. Required when horizontal scaling is needed.

---

## Testing

```bash
# Run all unit tests
npm test

# Watch mode
npx vitest
```

Unit tests mock `src/db/client` so no database is required.

| Test file | What it covers |
|---|---|
| `geo.test.ts` | `haversineKm` — distance accuracy, symmetry, zero-distance case |
| `identity.test.ts` | `deriveEmojis` — determinism, palette bounds, different inputs |
| `status.test.ts` | `calculateStatus` — all three states, radius boundaries, time windows |
| `incidents-filters.test.ts` | `listIncidents` — WHERE clause generation for each filter combination; `myVote` always null |

---

## Production Deployment

### 1. Environment

Set `DATABASE_URL` to the same connection string used by `mobile/backend`. The two services must point to the same PostgreSQL instance.

```bash
DATABASE_URL=postgresql://user:pass@db.host:5432/balagh
OPERATOR_TOKEN=$(openssl rand -hex 32)   # generate a strong secret
PORT=4000
DASHBOARD_ORIGIN=https://dashboard.yourdomain.com
LOG_LEVEL=warn
```

### 2. Build and run

```bash
npm run build
NODE_ENV=production node dist/server.js
```

Or with PM2:

```bash
npm install -g pm2
pm2 start dist/server.js --name balagh-web-backend
pm2 save
```

### 3. TLS

Terminate TLS at your load balancer or Nginx. The app serves plain HTTP and WS internally. WebSocket upgrades (`ws://`) must be proxied as `wss://` at the edge.

Example Nginx snippet:

```nginx
location / {
    proxy_pass         http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection "upgrade";
    proxy_set_header   Host $host;
}
```

### 4. CORS

Set `DASHBOARD_ORIGIN` to the exact origin of the deployed dashboard (e.g. `https://dashboard.yourdomain.com`). Never use `*`.

### 5. Health check

Configure your load balancer or container health check to poll `GET /health`. It returns `200 {"ok":true,"db":"ok"}` when the process is running and the database is reachable.

### Smoke-test checklist

```bash
BASE=https://api.yourdomain.com
TOKEN=your-operator-token

# Health (ungated)
curl $BASE/health

# Localities (gated)
curl -H "Authorization: Bearer $TOKEN" "$BASE/localities" | jq 'length'

# Global active incidents
curl -H "Authorization: Bearer $TOKEN" "$BASE/incidents" | jq 'length'

# Status for a point
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/status?lat=32.794&lng=34.9896"
# {"state":"calm","reason":"no_nearby_incidents"}

# WS auth handshake (requires wscat: npm i -g wscat)
wscat -c "wss://api.yourdomain.com/ws" \
  --execute '{"type":"auth","token":"your-operator-token"}'
# should receive {"type":"auth_ok"}
```

---

## Shared Contract Files

The following files are **mirrored** from `mobile/backend`. If `mobile/backend` changes them, update the web/backend copies and add a keep-in-sync note.

| File | Mirrors |
|---|---|
| `src/lib/contracts.ts` | `mobile/backend/src/lib/contracts.ts` |
| `src/lib/constants.ts` | `mobile/backend/src/lib/constants.ts` |
| `src/lib/geo.ts` | `mobile/backend/src/lib/geo.ts` |
| `src/lib/identity.ts` | `mobile/backend/src/lib/identity.ts` |
| `src/lib/errors.ts` | `mobile/backend/src/lib/errors.ts` |
| `src/db/schema.ts` | `mobile/backend/src/db/schema.ts` |
| `src/modules/status/service.ts` (calculateStatus) | `mobile/backend/src/modules/status/service.ts` |

> **Never run migrations from this service.** `mobile/backend` is the sole schema owner. Adding `drizzle-kit push` or `migrate.ts` to this service would create a split-brain schema situation.
