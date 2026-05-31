# Balagh Backend — Minimal Architecture Specification

> **Stack in one line:** Single Fastify process · PostgreSQL 16 + PostGIS 3.4 (Drizzle) · In-memory EventEmitter WebSocket · In-app notifications only.
>
> No Redis. No queue. No worker. No push service. No object storage.

---

## Table of Contents

1. [Frontend Analysis](#1-frontend-analysis)
2. [Backend Requirements](#2-backend-requirements)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Project Structure](#5-project-structure)
6. [Database Design](#6-database-design)
7. [API Design](#7-api-design)
8. [Realtime (WebSocket)](#8-realtime-websocket)
9. [Security](#9-security)
10. [Infrastructure](#10-infrastructure)
11. [Development Phases & AI Prompts](#11-development-phases--ai-prompts)
12. [Final Recommendation](#12-final-recommendation)

---

## 1. Frontend Analysis

### Repository Interfaces

The frontend declares four repository interfaces in `src/data/repositories/interfaces.ts`. Every method must map to exactly one backend endpoint or WebSocket event.

| Interface | Method | Signature |
|---|---|---|
| `IIncidentRepository` | `getIncidents` | `(lat, lng, radiusKm) → Incident[]` |
| `IIncidentRepository` | `getIncident` | `(id) → Incident` |
| `IIncidentRepository` | `submitReport` | `(category, lat, lng, description?) → {id, ref}` |
| `IIncidentRepository` | `vote` | `(incidentId, vote: 'confirm'\|'deny') → Incident` |
| `IIncidentRepository` | `getComments` | `(incidentId) → Comment[]` |
| `IIncidentRepository` | `addComment` | `(incidentId, body) → Comment` |
| `INotificationRepository` | `getNotifications` | `() → AppNotification[]` |
| `INotificationRepository` | `markRead` | `(ids: string[]) → void` |
| `INotificationRepository` | `markAllRead` | `() → void` |
| `ILocalityRepository` | `searchLocalities` | `(query) → Locality[]` |
| `IStatusRepository` | `getStatus` | `(lat, lng) → StatusResponse` |
| *(FollowUp screen)* | `submitFollowUp` | `POST /follow-up/:ref` → void |

### Wire Types (from `src/core/types/index.ts`)

```ts
type Severity    = 'critical' | 'high' | 'medium' | 'low';
type Category    = 'GUNFIRE' | 'STABBING' | 'ASSAULT' | 'ROBBERY' | 'SUSPICIOUS' | 'OTHER';
type SafetyState = 'calm' | 'watch' | 'active';

interface Incident {
  id: string; ref: string; category: Category; severity: Severity;
  description?: string; lat: number; lng: number; localityId: string;
  createdAt: string; resolvedAt?: string;
  confirmations: number; denials: number; commentCount: number;
  myVote?: 'confirm' | 'deny' | null;
}

interface Comment {
  id: string; incidentId: string;
  identityTag: [string, string, string];   // 3-emoji deterministic tag
  body: string; createdAt: string;
}

interface AppNotification {
  id: string; type: 'nearby' | 'verification' | 'status' | 'follow_up';
  title: string; body: string; createdAt: string; read: boolean;
  incidentRef?: string;
}

interface StatusResponse { state: SafetyState; reason: string; }

type WsEvent =
  | { t: 'incident.created';  incident: Incident }
  | { t: 'incident.resolved'; id: string }
  | { t: 'status.changed';    state: SafetyState; reason: string }
  | { t: 'vote.updated';      id: string; confirmations: number; denials: number }
  | { t: 'notification.new';  notification: AppNotification };
```

### Runtime Constants (from `src/core/config.ts`)

```ts
INCIDENT_RADIUS_KM = 5      // getIncidents geo fence
WATCH_RADIUS_KM    = 3      // watch-state threshold
ACTIVE_RADIUS_KM   = 1      // active-state threshold
WATCH_WINDOW_MIN   = 60     // look-back window for watch
ACTIVE_WINDOW_MIN  = 15     // look-back window for active
ACTIVE_THRESHOLD   = 3      // min verified incidents for active state
```

### Network Coordinates

```
API_BASE_URL  http://localhost:3000         (dev) / https://api.balagh.app (prod)
WS_URL        ws://localhost:3000/ws        (dev) / wss://api.balagh.app/ws (prod)
```

### Logic to Port Verbatim

| Logic | Source file |
|---|---|
| `deriveEmojis(pubHex)` + 32-emoji palette | `src/core/identity/index.ts` |
| `haversineKm()` + status rules | `src/data/mock/MockStatusRepo.ts` |
| `SEVERITY_MAP` (`GUNFIRE/STABBING→critical`, `ASSAULT/ROBBERY→high`, `SUSPICIOUS/OTHER→medium`) | `src/data/mock/MockIncidentRepo.ts` |
| Seed localities (18 cities) | `src/data/mock/db.ts` → `LOCALITIES` array |

---

## 2. Backend Requirements

### Functional

- Accept incident reports (anonymous, no media, text description ≤280 chars).
- Serve geo-filtered incident lists (`ST_DWithin`) and individual detail.
- Record confirm/deny votes per device (one vote per incident per device).
- Store and serve comments per incident (body ≤280 chars, emoji identity tag).
- Compute and serve safety status (`calm`/`watch`/`active`) from incident history.
- Locality search (trigram, Arabic/Hebrew/English).
- Notification store: create, list, mark-read, mark-all-read per device.
- Follow-up submission: store structured detail after an incident report.
- Real-time fan-out: push `WsEvent`s to clients subscribed within a geo radius.
- Admin: hide or resolve an incident (single protected route).

### Non-Functional

- **Privacy:** zero personal data. `device_id` is a random hex string from the app.
- **Anonymity:** no accounts, no email, no phone.
- **No police/state integration** — not now, not ever.
- **Idempotency:** `idempotency_key` column on `incidents` for offline-replay safety.
- Rate limiting: in-memory, per IP.
- 426 response when client version is too old (configurable minimum version header).
- Health endpoint for deployment liveness checks.

### Explicitly Not Built (MVP)

| Dropped | Reason |
|---|---|
| Redis (cache / pub-sub / rate buckets) | Single process → in-memory bus + in-memory rate limit suffice |
| BullMQ / any queue | Notification fan-out runs inline; incident counts are small |
| FCM / APNs push | Frontend defers push; WebSocket + in-app inbox is enough |
| S3 / object storage | App accepts no media |
| Moderation scoring / shadow-ban / audit log | Admin hide/resolve + rate limit covers MVP; defer the rest |
| NestJS modules / DI container | Fastify route+service files are sufficient structure |
| Separate API gateway / WS gateway / worker | One Fastify process hosts HTTP + WS |

**Scale-up path (document only — not built):** add Redis pub/sub when running >1 instance; swap in-memory rate limit for `redis-rate-limit`; add BullMQ for retryable push when FCM/APNs is introduced.

---

## 3. Architecture Overview

### Component Diagram

```mermaid
graph TD
    App["Mobile App\n(React Native)"]

    subgraph "Single Node Process"
        HTTP["Fastify HTTP\nRoutes"]
        WS["Fastify WS\n/ws"]
        Bus["In-Memory\nEventEmitter Bus"]
        HTTP --> Bus
        WS  --> Bus
        Bus --> WS
    end

    DB[(PostgreSQL 16\n+ PostGIS 3.4)]

    App -- "REST (HTTP/S)" --> HTTP
    App -- "WebSocket"     --> WS
    HTTP --> DB
    WS   --> DB
```

### Request Flow — Submit Report

```mermaid
sequenceDiagram
    participant App
    participant Fastify
    participant DB
    participant Bus

    App->>Fastify: POST /incidents {category, lat, lng, description}
    Fastify->>DB: INSERT incident (idempotency check)
    Fastify->>DB: INSERT notifications for nearby devices
    Fastify->>Bus: emit incident.created + notification.new per device
    Bus->>App: WsEvent {t:'incident.created', incident}
    Fastify-->>App: 201 {id, ref}
```

### Event Flow — Status Computation

```mermaid
sequenceDiagram
    participant App
    participant Fastify
    participant DB

    App->>Fastify: GET /status?lat=&lng=
    Fastify->>DB: SELECT incidents WHERE ST_DWithin AND NOT resolved AND createdAt > window
    Fastify-->>App: {state:'active'|'watch'|'calm', reason}
```

---

## 4. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 22 (LTS) | Wide ecosystem, same language as frontend |
| Framework | **Fastify 5** | ~40k req/s, built-in Pino logging, TypeScript-first |
| WebSocket | `@fastify/websocket` | Integrates into Fastify lifecycle; zero extra process |
| Database | **PostgreSQL 16 + PostGIS 3.4** | `ST_DWithin` geo queries; single dependency |
| ORM | **Drizzle** | SQL-first, PostGIS-compatible, tiny bundle |
| Validation | **Zod** | Schema → type inference; shared contract validation |
| Logging | **Pino** (Fastify built-in) | Structured JSON, zero-config |
| Rate limiting | `@fastify/rate-limit` (in-memory) | No Redis required for single instance |
| Config | Zod-validated env | Fail-fast on missing vars at boot |
| Testing | Vitest + Testcontainers | Unit tests + real Postgres for integration |
| Container | Docker (multi-stage) | Reproducible builds |

---

## 5. Project Structure

```
mobile/backend/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── Dockerfile
├── docker-compose.yml          # postgres + postgis only
├── .env.example
└── src/
    ├── server.ts               # entrypoint: Fastify bootstrap (HTTP + WS)
    ├── config.ts               # Zod-validated env
    ├── lib/
    │   ├── errors.ts           # AppError class + Fastify error handler
    │   ├── geo.ts              # haversineKm() — ported from MockStatusRepo
    │   ├── identity.ts         # deriveEmojis() — ported from frontend
    │   ├── events.ts           # typed in-memory EventEmitter bus
    │   └── contracts.ts        # mirror of src/core/types/index.ts
    ├── db/
    │   ├── client.ts           # Drizzle + pg Pool
    │   ├── schema.ts           # all table definitions
    │   ├── seed.ts             # seed localities (18 cities)
    │   └── migrations/         # drizzle-kit generated SQL
    ├── realtime/
    │   └── ws.ts               # /ws handler, subscription registry, broadcast
    └── modules/
        ├── incidents/
        │   ├── routes.ts
        │   └── service.ts      # geo query, vote, submit, comment logic
        ├── status/
        │   ├── routes.ts
        │   └── service.ts      # status rule engine
        ├── localities/
        │   └── routes.ts       # search via trigram index
        ├── notifications/
        │   └── routes.ts       # list, mark-read, mark-all-read
        ├── followups/
        │   └── routes.ts       # POST /follow-up/:ref
        └── admin/
            └── routes.ts       # hide / resolve (bearer token)
```

---

## 6. Database Design

### Entity-Relationship (logical)

```mermaid
erDiagram
    localities {
        text id PK
        text name_ar
        text name_he
        text name_en
        float8 lat
        float8 lng
    }
    incidents {
        uuid id PK
        text ref UK
        text idempotency_key UK
        text device_id
        text category
        text severity
        text description
        float8 lat
        float8 lng
        geography geom
        text locality_id FK
        timestamptz created_at
        timestamptz resolved_at
        bool hidden
        int confirmations
        int denials
        int comment_count
    }
    votes {
        uuid id PK
        uuid incident_id FK
        text device_id
        text vote
    }
    comments {
        uuid id PK
        uuid incident_id FK
        text device_id
        text emoji0
        text emoji1
        text emoji2
        text body
        timestamptz created_at
    }
    devices {
        text device_id PK
        float8 last_lat
        float8 last_lng
        timestamptz updated_at
    }
    notifications {
        uuid id PK
        text device_id
        text type
        text title
        text body
        text incident_ref
        bool read
        timestamptz created_at
    }
    follow_ups {
        uuid id PK
        text incident_ref
        text device_id
        text vehicle
        text assailants
        text direction
        text weapon
        timestamptz created_at
    }

    localities ||--o{ incidents : "locality_id"
    incidents  ||--o{ votes : "incident_id"
    incidents  ||--o{ comments : "incident_id"
    devices    ||--o{ notifications : "device_id"
```

### DDL

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE localities (
  id        TEXT PRIMARY KEY,
  name_ar   TEXT NOT NULL,
  name_he   TEXT NOT NULL,
  name_en   TEXT NOT NULL,
  lat       FLOAT8 NOT NULL,
  lng       FLOAT8 NOT NULL
);

CREATE TABLE incidents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref              TEXT UNIQUE NOT NULL,
  idempotency_key  TEXT UNIQUE,
  device_id        TEXT NOT NULL,
  category         TEXT NOT NULL,
  severity         TEXT NOT NULL,
  description      TEXT CHECK (char_length(description) <= 280),
  lat              FLOAT8 NOT NULL,
  lng              FLOAT8 NOT NULL,
  geom             GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (
                     ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
                   ) STORED,
  locality_id      TEXT REFERENCES localities(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  hidden           BOOLEAN NOT NULL DEFAULT false,
  confirmations    INT NOT NULL DEFAULT 0,
  denials          INT NOT NULL DEFAULT 0,
  comment_count    INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_incidents_geom    ON incidents USING GIST (geom);
CREATE INDEX idx_incidents_created ON incidents (created_at DESC);

CREATE TABLE votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id),
  device_id   TEXT NOT NULL,
  vote        TEXT NOT NULL CHECK (vote IN ('confirm', 'deny')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (incident_id, device_id)
);

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id),
  device_id   TEXT NOT NULL,
  emoji0      TEXT NOT NULL,
  emoji1      TEXT NOT NULL,
  emoji2      TEXT NOT NULL,
  body        TEXT NOT NULL CHECK (char_length(body) <= 280),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
  device_id  TEXT PRIMARY KEY,
  last_lat   FLOAT8,
  last_lng   FLOAT8,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('nearby','verification','status','follow_up')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  incident_ref TEXT,
  read         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_device ON notifications (device_id, created_at DESC);

CREATE TABLE follow_ups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_ref TEXT NOT NULL,
  device_id    TEXT NOT NULL,
  vehicle      TEXT,
  assailants   TEXT,
  direction    TEXT,
  weapon       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Locality trigram indexes
CREATE INDEX idx_localities_ar ON localities USING GIN (name_ar gin_trgm_ops);
CREATE INDEX idx_localities_he ON localities USING GIN (name_he gin_trgm_ops);
CREATE INDEX idx_localities_en ON localities USING GIN (name_en gin_trgm_ops);
```

### PostGIS Strategy

- `geom` is a **generated stored column** — never written manually, always derived from `(lng, lat)`.
- Geo queries use `ST_DWithin(geom, ST_SetSRID(ST_MakePoint($lng,$lat),4326)::geography, $meters)`.
- `radiusKm` from the app is converted to metres before calling `ST_DWithin`.
- GiST index on `geom` keeps these queries fast even at tens of thousands of rows.

---

## 7. API Design

All endpoints return JSON. Errors follow `{code: string, message: string}`. The `X-Device-Id` header is required on every write request; it is the random hex string generated by the app.

### 7.1 Incidents

#### `GET /incidents`

Geo-filtered list of active (non-hidden, non-resolved) incidents.

| Param | Type | Required |
|---|---|---|
| `lat` | number | yes |
| `lng` | number | yes |
| `radiusKm` | number (max 10) | yes |

**Response 200:** `Incident[]` — `myVote` resolved from `votes` table using `X-Device-Id`.

#### `GET /incidents/:id`

**Response 200:** Single `Incident` · **404** if not found or hidden.

#### `POST /incidents`

**Request body:**
```json
{ "category":"ASSAULT","lat":32.51,"lng":35.15,
  "description":"optional text","idempotencyKey":"client-uuid" }
```

**Validation:** category ∈ known set · lat ∈ [-90,90] · lng ∈ [-180,180] · description ≤280 chars.

**Response 201:** `{ "id":"uuid","ref":"BLG-XXXXXX" }`

Duplicate `idempotencyKey` → return existing `{id,ref}` with 200.

**Side effects:**
1. Insert incident (severity derived from SEVERITY_MAP).
2. Insert `notification` rows for devices within `WATCH_RADIUS_KM`.
3. Emit `incident.created` on bus → geo-broadcast.
4. Emit `notification.new` targeted per notified device.

#### `POST /incidents/:id/vote`

**Request body:** `{ "vote": "confirm" | "deny" }`

**Response 200:** Updated `Incident`. **409** if device already voted. **404** if not found.

**Side effect:** emit `vote.updated` on bus.

### 7.2 Comments

#### `GET /incidents/:id/comments`

**Response 200:** `Comment[]` ordered by `created_at`.

#### `POST /incidents/:id/comments`

**Request body:** `{ "body": "text ≤ 280 chars" }`

`identityTag` derived server-side: `deriveEmojis(deviceId)` (same algorithm as `src/core/identity/index.ts`).

**Response 201:** `Comment` object. Increments `incidents.comment_count`.

### 7.3 Status

#### `GET /status`

| Param | Type | Required |
|---|---|---|
| `lat` | number | yes |
| `lng` | number | yes |

**Logic (ported from `MockStatusRepo`):**
1. Filter non-resolved, non-hidden incidents.
2. `active`: incidents within `ACTIVE_RADIUS_KM` (1 km) + within `ACTIVE_WINDOW_MIN` (15 min) + `confirmations ≥ 1` — if count ≥ `ACTIVE_THRESHOLD` (3) → `{state:'active', reason:'multiple_verified_nearby'}`.
3. `watch`: incidents within `WATCH_RADIUS_KM` (3 km) + within `WATCH_WINDOW_MIN` (60 min) — if count ≥ 1 → `{state:'watch', reason:'incident_nearby'}`.
4. Otherwise → `{state:'calm', reason:'no_nearby_incidents'}`.

**Response 200:** `StatusResponse`

**Side effect:** upsert `devices(device_id, last_lat, last_lng)` for notification fan-out.

### 7.4 Localities

#### `GET /localities`

| Param | Type | Required |
|---|---|---|
| `q` | string | no |

Empty/absent → all 18 seed localities. Non-empty → trigram ILIKE on `name_ar`, `name_he`, `name_en`.

**Response 200:** `Locality[]`

### 7.5 Notifications

#### `GET /notifications`

Returns notifications for `X-Device-Id`, newest first.

**Response 200:** `AppNotification[]`

#### `POST /notifications/read`

**Request body:** `{ "ids": ["uuid", "…"] }`  **Response 204.**

#### `POST /notifications/read-all`

**Response 204.**

### 7.6 Follow-ups

#### `POST /follow-up/:ref`

**Request body:**
```json
{
  "vehicle":    "yes" | "no" | null,
  "assailants": "1" | "2" | "3+" | null,
  "direction":  "north" | "south" | "east" | "west" | null,
  "weapon":     "yes" | "no" | null
}
```

**Response 201:** `{ "ok": true }`

### 7.7 Admin

All admin routes require `Authorization: Bearer <ADMIN_TOKEN>`.

#### `POST /admin/incidents/:id/resolve`

Sets `resolved_at = now()`. Emits `incident.resolved` on bus.

#### `POST /admin/incidents/:id/hide`

Sets `hidden = true`. No WS event.

**Both:** Response 200 `{ "ok": true }` · 401 on wrong token · 404 if not found.

### 7.8 Health

#### `GET /health`

**Response 200:** `{ "ok": true, "db": "ok" }` (performs `SELECT 1`).

### 7.9 Error Envelope

```json
{ "code": "NOT_FOUND", "message": "Incident not found" }
```

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod parse failure |
| 404 | `NOT_FOUND` | Resource not found or hidden |
| 409 | `DUPLICATE_VOTE` | Device already voted |
| 409 | `DUPLICATE_REPORT` | `idempotencyKey` already used |
| 426 | `UPDATE_REQUIRED` | Client version below minimum |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected error |

### 7.10 Contract Traceability Matrix

Every frontend repository method and every `WsEvent` variant maps to exactly one backend item.

| Frontend | Backend | Notes |
|---|---|---|
| `getIncidents(lat, lng, radiusKm)` | `GET /incidents?lat&lng&radiusKm` | `myVote` joined per device |
| `getIncident(id)` | `GET /incidents/:id` | 404 if hidden |
| `submitReport(category, lat, lng, desc?)` | `POST /incidents` | Returns `{id, ref}` |
| `vote(incidentId, 'confirm'\|'deny')` | `POST /incidents/:id/vote` | 409 on duplicate |
| `getComments(incidentId)` | `GET /incidents/:id/comments` | Ordered by `created_at` |
| `addComment(incidentId, body)` | `POST /incidents/:id/comments` | `identityTag` derived server-side |
| `getNotifications()` | `GET /notifications` | Filtered by `X-Device-Id` |
| `markRead(ids)` | `POST /notifications/read` | Body: `{ids}` |
| `markAllRead()` | `POST /notifications/read-all` | |
| `searchLocalities(query)` | `GET /localities?q=` | Trigram; empty → all 18 |
| `getStatus(lat, lng)` | `GET /status?lat&lng` | Same rule logic as MockStatusRepo |
| FollowUp screen submit | `POST /follow-up/:ref` | Structured detail fields |
| `WsEvent incident.created` | Bus emit after `POST /incidents` | Geo-filtered to subscribed clients |
| `WsEvent incident.resolved` | Bus emit after admin resolve | Broadcast to all subscribed clients |
| `WsEvent status.changed` | Bus emit after vote or new incident | Broadcast to geo-subscribed clients |
| `WsEvent vote.updated` | Bus emit after `POST /incidents/:id/vote` | Broadcast to incident-area clients |
| `WsEvent notification.new` | Bus emit targeted per device | `broadcastToDevice(deviceId)` |

---

## 8. Realtime (WebSocket)

### Connection

`GET /ws` — upgraded to WebSocket by `@fastify/websocket`.

First message from client must be a subscription frame:

```json
{ "type": "subscribe", "lat": 32.51, "lng": 35.15, "radiusKm": 5 }
```

The server registers `{socket, deviceId, lat, lng, radiusKm}` in an in-memory `Map`. Client may re-send `subscribe` at any time to update its geo position.

### In-Memory Bus

```ts
// src/lib/events.ts
import { EventEmitter } from 'node:events';

export const bus = new EventEmitter();
bus.setMaxListeners(0);

export function broadcast(event: WsEvent, filter: (sub: Subscription) => boolean) {
  for (const sub of subscriptions.values()) {
    if (filter(sub)) sub.socket.send(JSON.stringify(event));
  }
}

export const broadcastGeo = (event: WsEvent, lat: number, lng: number) =>
  broadcast(event, sub => haversineKm(sub.lat, sub.lng, lat, lng) <= sub.radiusKm);

export const broadcastToDevice = (event: WsEvent, deviceId: string) =>
  broadcast(event, sub => sub.deviceId === deviceId);

export const broadcastAll = (event: WsEvent) =>
  broadcast(event, () => true);
```

### Broadcast Rules

| Event | Broadcast call |
|---|---|
| `incident.created` | `broadcastGeo(event, incident.lat, incident.lng)` |
| `incident.resolved` | `broadcastAll(event)` |
| `status.changed` | `broadcastAll(event)` |
| `vote.updated` | `broadcastGeo(event, incident.lat, incident.lng)` |
| `notification.new` | `broadcastToDevice(event, deviceId)` |

### Keepalive

Server sends `{"type":"ping"}` every 30 seconds. Connections silent for 90 seconds are closed with code 4000.

### Scale-up Note

When running multiple instances, replace the `EventEmitter` bus with Redis pub/sub and replace the in-memory subscription `Map` with a Redis hash. The broadcast function signature stays identical.

---

## 9. Security

### Device Identity

`X-Device-Id` — 32-byte random hex generated by the app (`src/core/identity/index.ts`). Stored in `devices` table. No authentication, no signup.

Optional future hardening: HMAC-SHA256 request signing (`X-Signature`, `X-Timestamp`). The frontend stub `signRequest()` is already in place.

### Validation

All request bodies and query params are parsed with Zod. Invalid input → 400 `VALIDATION_ERROR` before any DB operation.

### Rate Limiting

`@fastify/rate-limit` (in-memory, per IP):

| Route | Limit |
|---|---|
| `POST /incidents` | 5 / minute |
| `POST /incidents/:id/vote` | 20 / minute |
| `POST /incidents/:id/comments` | 10 / minute |
| All other routes | 100 / minute |

### Vote Idempotency

`UNIQUE (incident_id, device_id)` enforced at DB level. Returns 409 on conflict.

### Report Idempotency

`idempotency_key` is UNIQUE on `incidents`. Duplicate → return existing `{id, ref}` with 200.

### Admin Route

`ADMIN_TOKEN` env var. All `/admin/*` routes check `Authorization: Bearer <ADMIN_TOKEN>`. Return 401 on mismatch.

### 426 Update Gate

If `X-App-Version` header is present and semver below `MIN_APP_VERSION`, return 426 `UPDATE_REQUIRED`. The frontend's `shouldGateForStatus(426)` handles this.

### Privacy

- No personal data in any table (no name, email, phone, IP stored permanently).
- IPs used only transiently for in-memory rate limiting; never persisted.
- `device_id` is a random hex string with no link to a real person.
- No police or state integration, ever.

---

## 10. Infrastructure

### Docker

**`Dockerfile`** (multi-stage):

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
```

**`docker-compose.yml`** (development only — PostGIS only, no app service):

```yaml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: balagh
      POSTGRES_USER: balagh
      POSTGRES_PASSWORD: balagh
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### Environment Variables

```bash
# .env.example
DATABASE_URL=postgresql://balagh:balagh@localhost:5432/balagh
PORT=3000
ADMIN_TOKEN=change-me-in-production
MIN_APP_VERSION=1.0.0
LOG_LEVEL=info
```

### CI (GitHub Actions)

```yaml
# .github/workflows/backend.yml
on:
  push:
    paths: [mobile/backend/**]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
        working-directory: mobile/backend
      - run: npx tsc --noEmit
        working-directory: mobile/backend
      - run: npx eslint src
        working-directory: mobile/backend
      - run: npx vitest run
        working-directory: mobile/backend
      - run: npx tsc --outDir dist
        working-directory: mobile/backend
```

### Production Deployment

- Managed PostgreSQL with PostGIS (Supabase, Railway, Neon, or self-hosted).
- Enable PITR backups on the DB.
- Single Node process (Fly.io, Railway, Render, or VPS behind Nginx).
- TLS termination at the load balancer / Nginx level.
- `GET /health` wired to liveness check.
- Run `npm run migrate` then `npm run seed` on first deploy.

---

## 11. Development Phases & AI Prompts

### Shared Context Block

Paste this block at the top of every phase prompt:

```
PROJECT CONTEXT — Balagh Backend (paste before each phase prompt)
=================================================================
Stack: Fastify 5, TypeScript strict, PostgreSQL 16 + PostGIS 3.4, Drizzle ORM, Zod, Pino.
Single process: HTTP routes + WebSocket at /ws in one Fastify instance.
No Redis. No queue. No external push service. No object storage.
Repo root: mobile/backend/
All API routes return JSON. Errors: {code:string, message:string}.
Device identity: X-Device-Id header (32-byte random hex from app).
Key constants (from frontend config.ts):
  INCIDENT_RADIUS_KM=5, WATCH_RADIUS_KM=3, ACTIVE_RADIUS_KM=1
  WATCH_WINDOW_MIN=60, ACTIVE_WINDOW_MIN=15, ACTIVE_THRESHOLD=3
Severity map: GUNFIRE/STABBING→critical, ASSAULT/ROBBERY→high, SUSPICIOUS/OTHER→medium
ref format: BLG-XXXXXX (6-char base36 uppercase)
SEVERITY_MAP source: src/data/mock/MockIncidentRepo.ts in the frontend.
deriveEmojis source: src/core/identity/index.ts in the frontend (port verbatim).
haversineKm source: src/data/mock/MockStatusRepo.ts in the frontend (port verbatim).
18 seed localities: see LOCALITIES array in src/data/mock/db.ts in the frontend.
Wire types: see src/core/types/index.ts in the frontend (mirror into src/lib/contracts.ts).
=================================================================
```

---

### Phase 1 — Foundation

**Deliverables:** Fastify server, Zod config, Drizzle + PostGIS schema, error handler, health endpoint, localities route with seed data.

After this phase: `GET /health` → 200, `GET /localities` → 18 cities.

```
[paste shared context block above]

PHASE 1 — Foundation
====================
Create the complete Phase 1 implementation for mobile/backend/.

1. package.json
   Dependencies: fastify, @fastify/websocket, @fastify/rate-limit, @fastify/cors,
   drizzle-orm, drizzle-kit, postgres (or pg), zod, pino.
   Dev: typescript, tsx, vitest, @types/node.
   Scripts: dev (tsx watch src/server.ts), build (tsc), migrate (drizzle-kit migrate), seed.

2. tsconfig.json — strict, target ES2022, moduleResolution Node16.

3. src/config.ts — Zod schema for env vars: DATABASE_URL, PORT (default 3000),
   ADMIN_TOKEN, MIN_APP_VERSION (default "1.0.0"), LOG_LEVEL (default "info").
   Export typed `config` object. Throw at import time on missing required vars.

4. src/lib/errors.ts — AppError class (code: string, message: string, statusCode: number).
   Export a Fastify setErrorHandler callback that serialises AppError to {code, message}.
   Map unknown errors to 500 INTERNAL_ERROR.

5. src/db/schema.ts — Drizzle schema for ALL tables in §6 of the spec:
   localities, incidents (geom as generated column), votes, comments,
   devices, notifications, follow_ups. Include all indexes.

6. src/db/client.ts — Drizzle client using pg Pool, exported as `db`.

7. src/db/seed.ts — Insert the 18 localities (port LOCALITIES array verbatim from
   frontend src/data/mock/db.ts). Use INSERT … ON CONFLICT DO NOTHING.

8. src/lib/contracts.ts — Mirror of frontend src/core/types/index.ts.
   Export: Severity, Category, SafetyState, Incident, Comment, AppNotification,
   StatusResponse, WsEvent, ApiError.

9. src/modules/localities/routes.ts — GET /localities?q=
   Empty q → all rows. Non-empty → trigram ILIKE on name_ar, name_he, name_en.
   Return Locality[].

10. src/server.ts — Fastify instance with Pino logger, CORS, rate-limit plugin,
    error handler. Register localities routes. Add GET /health (SELECT 1 + return
    {ok:true, db:"ok"}). Listen on config.PORT.

11. drizzle.config.ts — point to src/db/schema.ts, output migrations/.

12. .env.example — all vars from step 3.

13. docker-compose.yml — postgis/postgis:16-3.4 service only.

Rules: TypeScript strict, no `any`. Validate with Zod. No audio, no media,
no personal data stored. No Redis, no queue, no push service.
```

---

### Phase 2 — Core Domain

**Deliverables:** Incidents (list, detail, submit, vote), Comments, Status.

After this phase: `USE_MOCK_API=false` in the frontend config works end-to-end for the main map flow.

```
[paste shared context block above]

PHASE 2 — Core Domain
=====================
Phase 1 is complete (Fastify running, DB connected, localities seeded).
Implement incidents, votes, comments, and status.

1. src/lib/geo.ts — port haversineKm(lat1,lng1,lat2,lng2):number verbatim
   from MockStatusRepo.ts. Export it.

2. src/lib/identity.ts — port deriveEmojis(pubHex:string):[string,string,string]
   verbatim from src/core/identity/index.ts (same 32-emoji palette + slice logic).
   Export it.

3. src/modules/incidents/service.ts
   getIncidents(deviceId, lat, lng, radiusKm): Incident[]
     ST_DWithin(geom, point, radiusKm*1000) AND NOT hidden AND resolved_at IS NULL.
     Join votes to resolve myVote for this deviceId.
   getIncident(deviceId, id): Incident   (404 if hidden/missing)
   submitReport(deviceId, category, lat, lng, description?, idempotencyKey?): {id, ref}
     - Derive severity from SEVERITY_MAP.
     - ref = "BLG-" + counter.toString(36).toUpperCase().padStart(6,"0").
     - INSERT incident; on idempotency_key conflict return existing {id,ref}.
     - Upsert devices(device_id, last_lat, last_lng).
     - Fan-out: SELECT devices within WATCH_RADIUS_KM → INSERT notification rows
       → return list of (device_id, notification) for WS emit (Phase 3 wires this).
   vote(deviceId, incidentId, 'confirm'|'deny'): Incident
     INSERT votes; UNIQUE conflict → throw 409 DUPLICATE_VOTE.
     UPDATE incidents confirmations/denials += 1. Return updated incident.
   getComments(incidentId): Comment[]
   addComment(deviceId, incidentId, body): Comment
     deriveEmojis(deviceId) → emoji0/1/2. INSERT comment.
     UPDATE incidents comment_count += 1. Return Comment.

4. src/modules/incidents/routes.ts
   GET  /incidents?lat&lng&radiusKm
   GET  /incidents/:id
   POST /incidents  {category,lat,lng,description?,idempotencyKey?}  → 201 {id,ref}
   POST /incidents/:id/vote  {vote}  → 200 Incident
   GET  /incidents/:id/comments  → 200 Comment[]
   POST /incidents/:id/comments  {body}  → 201 Comment
   All routes: require X-Device-Id header (400 if missing). Validate with Zod.

5. src/modules/status/service.ts — getStatus(lat, lng): StatusResponse
   Port exact logic from MockStatusRepo.ts using same constants.
   Use haversineKm from lib/geo.ts.
   Side effect: upsert devices(device_id, last_lat, last_lng).

6. src/modules/status/routes.ts — GET /status?lat&lng → 200 StatusResponse.

7. Register all new routes in server.ts.

8. Tests: unit tests for deriveEmojis, haversineKm, SEVERITY_MAP, status logic.
   Integration tests (testcontainers postgis): submit → list → vote round-trip,
   idempotency key returns same ref, duplicate vote returns 409.
```

---

### Phase 3 — Realtime

**Deliverables:** `/ws` WebSocket handler, in-memory bus, geo-filtered broadcast of all 5 `WsEvent` types.

```
[paste shared context block above]

PHASE 3 — Realtime WebSocket
=============================
Phases 1 and 2 are complete. Add /ws and the in-memory event bus.

1. src/lib/events.ts
   - bus: node:events EventEmitter, setMaxListeners(0).
   - Subscription type: {socket, deviceId, lat, lng, radiusKm}.
   - subscriptions: Map<string, Subscription>.
   - broadcast(event, filter): iterate subscriptions, apply filter, socket.send(JSON.stringify(event)).
   - broadcastGeo(event, lat, lng): filter by haversineKm <= sub.radiusKm.
   - broadcastToDevice(event, deviceId): filter by sub.deviceId === deviceId.
   - broadcastAll(event): no filter.

2. src/realtime/ws.ts
   - Register @fastify/websocket in server.ts.
   - Route GET /ws (websocket: true).
   - On connection:
     a. Parse X-Device-Id from query or header (close 4001 if missing).
     b. Register subscription with default radiusKm=INCIDENT_RADIUS_KM.
     c. On message: type:"subscribe" → update lat/lng/radiusKm.
                    type:"pong" → reset keepalive timer.
     d. Keepalive: ping every 30s; close 4000 if silent 90s.
     e. On close/error: delete from subscriptions, clear timers.

3. Wire bus into incident service:
   After submitReport: broadcastGeo({t:'incident.created', incident}, lat, lng).
     Per notified device: broadcastToDevice({t:'notification.new', notification}, deviceId).
   After vote: broadcastGeo({t:'vote.updated', id, confirmations, denials}, incident.lat, incident.lng).
     Recompute status; if state changed: broadcastAll({t:'status.changed', state, reason}).

4. src/modules/admin/routes.ts
   POST /admin/incidents/:id/resolve → resolved_at=now(), broadcastAll incident.resolved.
   POST /admin/incidents/:id/hide   → hidden=true (no WS event).
   Auth: Authorization: Bearer <ADMIN_TOKEN>. Return 401 on mismatch.

5. Register admin routes in server.ts.

6. Test: two WS clients with different radiuses, emit incident.created,
   verify only the in-range client receives the event.
```

---

### Phase 4 — Notifications & Follow-ups

**Deliverables:** Notification inbox endpoints, follow-up submission, targeted `notification.new` delivery.

```
[paste shared context block above]

PHASE 4 — Notifications & Follow-ups
=====================================
Phases 1–3 complete. Add notification inbox API and follow-up submission.

1. src/modules/notifications/routes.ts
   GET  /notifications — notifications for X-Device-Id, newest first.
   POST /notifications/read     {ids:string[]} → 204.
   POST /notifications/read-all              → 204.

2. Notification creation (confirm inline fan-out from Phase 2/3):
   In submitReport, after inserting the incident:
   SELECT device_id FROM devices WHERE ST_DWithin(point, incident_point, WATCH_RADIUS_KM*1000).
   For each device_id: INSERT notification {type:'nearby', title, body, incident_ref}.
   Emit broadcastToDevice({t:'notification.new', notification}, deviceId).
   Notification text can be language-neutral: title="بلاغ جديد", body="BLG-XXXXXX".

3. Verification notifications:
   In vote service: after UPDATE, if new confirmations === ACTIVE_THRESHOLD:
   INSERT notification {type:'verification'} for the incident's reporting device.
   Emit broadcastToDevice for that device.

4. src/modules/followups/routes.ts
   POST /follow-up/:ref {vehicle?, assailants?, direction?, weapon?}
   Validate all fields with Zod (allowed values per FollowUp.tsx in the frontend).
   INSERT follow_ups row. Response 201 {ok:true}.

5. Register new routes in server.ts.

6. Tests: new device has empty notification list; submit incident → nearby device
   gets notification row; mark-all-read clears them; follow-up stored correctly.
```

---

### Phase 5 — Hardening & Deploy

**Deliverables:** Tuned rate limits, 426 gate, Docker image, CI workflow, deploy notes.

```
[paste shared context block above]

PHASE 5 — Hardening & Deploy
=============================
Phases 1–4 complete. Final hardening before production.

1. Rate limits (@fastify/rate-limit, in-memory, per IP):
   POST /incidents:              5 req / 60s
   POST /incidents/:id/vote:    20 req / 60s
   POST /incidents/:id/comments: 10 req / 60s
   All other routes:            100 req / 60s
   Return 429 RATE_LIMITED on breach.

2. 426 Update Gate middleware:
   If X-App-Version header present and semver < config.MIN_APP_VERSION:
     return 426 {code:"UPDATE_REQUIRED", message:"Please update the app"}.
   If header absent: allow through (backward compat during rollout).

3. Full idempotency test: concurrent submitReport with same idempotencyKey →
   exactly one DB row, same {id,ref} returned both times.

4. Dockerfile — multi-stage (builder: npm ci + tsc; runner: node:22-alpine,
   USER node, EXPOSE 3000, CMD ["node","dist/server.js"]).

5. docker-compose.yml — postgis/postgis:16-3.4 service only (confirmed from Phase 1).

6. .github/workflows/backend.yml CI:
   Trigger: push to main, paths: [mobile/backend/**]
   Steps: checkout, node 22, npm ci, tsc --noEmit, eslint src, vitest run, tsc build.

7. Smoke-test checklist (add as DEPLOY.md or inline comments in server.ts):
   - GET /health → {ok:true, db:"ok"}
   - GET /localities → 18 rows
   - POST /incidents → 201 {id, ref}
   - GET /incidents?lat=32.51&lng=35.15&radiusKm=5 → includes new incident
   - WS subscribe → receive incident.created
   - GET /status?lat=32.51&lng=35.15 → calm/watch/active
   - GET /notifications → includes nearby notification
```

---

## 12. Final Recommendation

### What to build

The MVP backend is **one Node/TypeScript process** (Fastify), connected to **one PostgreSQL 16 + PostGIS database**. Nothing else is required. The in-memory EventEmitter handles WebSocket fan-out efficiently for all foreseeable early traffic. Notifications are stored in Postgres and delivered over WebSocket — no push service, no queue, no worker process.

Flipping `USE_MOCK_API = false` in `src/core/config.ts` is the only change needed in the frontend. Every repository method and every `WsEvent` type maps 1:1 to a backend endpoint or bus event (see §7.10).

### MVP → Scale path

| Trigger | Add |
|---|---|
| Multiple instances | Redis pub/sub replaces in-memory bus |
| Push notifications | FCM/APNs worker + BullMQ queue |
| Rate limiting across instances | Redis-backed `@fastify/rate-limit` |
| Moderation at scale | Scoring pipeline + audit log table |
| Media support (future) | S3 or compatible object store |

None of these are needed before launch. Build them only when the current system is measurably strained.

### Dependency summary

| Required for MVP | Deferred (scale-up) |
|---|---|
| Node.js 22 | Redis |
| PostgreSQL 16 + PostGIS 3.4 | FCM / APNs |
| Fastify 5 + `@fastify/websocket` + `@fastify/rate-limit` | BullMQ |
| Drizzle + Zod + Pino | S3 |
| Docker / docker-compose (dev) | CDN |
