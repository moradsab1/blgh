# Balagh Web Dashboard — Operator Frontend

Internal operator console for the Balagh community safety platform. Displays a live map of incidents, allows operators to resolve or hide reports, and provides locality-scoped safety status.

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · TanStack Query · Leaflet · `@tanstack/react-query`

---

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Mock vs Real Mode](#mock-vs-real-mode)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Auth Flow](#auth-flow)
- [WebSocket Connection](#websocket-connection)
- [NPM Scripts](#npm-scripts)
- [Testing](#testing)
- [Production Build](#production-build)

---

## Quick Start

### Prerequisites

- Node.js 22+
- `web/backend` running at `http://localhost:4000` (or set `VITE_USE_MOCK=true` to skip)

```bash
# 1. Install dependencies
npm install

# 2. Copy env file
cp .env.example .env
# Default .env.example points to web/backend at port 4000 with mock disabled

# 3. Start dev server
npm run dev
# → http://localhost:5173
```

Log in with your operator token (set in `web/backend/.env` as `OPERATOR_TOKEN`).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_USE_MOCK` | `true` | Set to `false` to connect to `web/backend`; any other value enables mock mode |
| `VITE_API_BASE_URL` | `http://localhost:4000` | Base URL of the `web/backend` HTTP API |
| `VITE_WS_URL` | `ws://localhost:4000/ws` | WebSocket URL of the `web/backend` real-time feed |

`.env.example`:

```bash
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
```

These values are read from `src/config.ts` — do not import `import.meta.env` directly elsewhere.

---

## Mock vs Real Mode

The `VITE_USE_MOCK` flag controls which data source the app uses.

| Mode | `VITE_USE_MOCK` | Data source | Backend required? |
|---|---|---|---|
| Mock | `true` (or absent) | In-memory fixture data (`src/mock/`) | No |
| Real | `false` | `web/backend` HTTP + WebSocket | Yes |

Switching modes requires **no code changes** — only the env var. The following hooks are mock-aware and route automatically:

- `useIncidents` — global list or geo-scoped list
- `useIncident` — single incident detail
- `useComments` — incident comments
- `useStatus` — safety state badge
- `useLocalities` — city picker data

In real mode, the incidents list additionally polls every **20 seconds** (`refetchInterval`) to pick up new incidents created by `mobile/backend` (cross-process; not live-pushed via WS).

---

## Project Structure

```
web/frontend/src/
├── config.ts                   # USE_MOCK, API_BASE_URL, WS_URL, DEFAULT_RADIUS_KM
├── version.ts                  # APP_VERSION (sent in X-App-Version header)
├── auth/
│   └── token.ts                # sessionStorage get/set/clear for operator token
├── lib/
│   ├── api.ts                  # fetch wrapper; adminPost sends Authorization header
│   ├── contracts.ts            # Wire types (mirrors web/backend/src/lib/contracts.ts)
│   ├── queryClient.ts          # TanStack Query client + query key factory
│   └── ws.ts                   # WebSocket client; sends auth frame before subscribe
├── mock/
│   ├── db.ts                   # In-memory fixture data (localities, incidents, comments)
│   └── mockApi.ts              # Mock implementations of all data fetchers
├── pages/
│   ├── Login.tsx               # Operator token entry
│   └── Console.tsx             # Main shell — locality picker, map, case rail, drawers
├── features/
│   ├── cases/
│   │   ├── CaseFilters.tsx     # Tab bar (active/resolved/hidden) + severity chips
│   │   ├── CaseList.tsx        # Virtualized incident list
│   │   └── useIncidents.ts     # Fetch + WS cache bridge + refetchInterval
│   ├── incident/
│   │   ├── IncidentDetail.tsx  # Detail drawer — timeline, comments, resolve/hide buttons
│   │   ├── useAdminActions.ts  # POST /incidents/:id/{resolve,hide}
│   │   ├── useComments.ts      # GET /incidents/:id/comments
│   │   └── useIncident.ts      # GET /incidents/:id
│   ├── localities/
│   │   ├── LocalityPicker.tsx  # Searchable city selector
│   │   └── useLocalities.ts    # GET /localities?q=
│   ├── map/
│   │   └── IncidentMap.tsx     # Leaflet map with severity-colored markers
│   └── status/
│       ├── StatusBadge.tsx     # calm / watch / active indicator chip
│       └── useStatus.tsx       # GET /status?lat&lng
└── components/
    ├── Drawer.tsx              # Side drawer for detail panel
    ├── ErrorState.tsx
    ├── LiveIndicator.tsx       # WS connection state dot
    ├── OfflineBanner.tsx
    └── Spinner.tsx
```

---

## Key Features

### Incident Map

Leaflet map centred on the selected locality. Incidents are plotted as severity-coloured circle markers:

- 🔴 Critical (`#DC2626`)
- 🟠 High (`#EA580C`)
- 🟡 Medium (`#D97706`)
- 🔵 Low (`#2563EB`)

Clicking a marker opens the detail drawer.

### Case Triage Rail

Filterable list on the left side of the console. Supports:
- Tab filter: active / resolved / hidden
- Severity multi-select chips
- Free-text search (client-side, no API call)

### Incident Detail

Drawer with full incident information, comment thread, and operator action buttons (Resolve, Hide). Actions call `POST /incidents/:id/{resolve,hide}` and optimistically update the TanStack Query cache.

### Locality Picker

Searchable dropdown backed by `GET /localities?q=` (or mock data). Selecting a locality scopes the map view and filters incidents by geo radius.

### Safety Status Badge

Shows `calm` / `watch` / `active` for the currently selected locality, computed by `GET /status?lat&lng`. Refreshes every 30 s.

---

## Auth Flow

1. The user enters their operator token in `Login.tsx`.
2. The token is stored in `sessionStorage` via `auth/token.ts` — **never `localStorage`**, never a cookie, never a URL query parameter.
3. `lib/api.ts` `adminPost()` and `api.get()` attach `Authorization: Bearer <token>` to every request (the entire API is operator-gated).
4. On `401`, the app fires a `balagh:unauthorized` custom DOM event which the router listens for to redirect to the login screen.

---

## WebSocket Connection

`lib/ws.ts` manages the operator WS connection:

1. Opens `ws://localhost:4000/ws` (or `VITE_WS_URL`) — **no token in the URL**.
2. Sends `{"type":"auth","token":"<token>"}` immediately on open.
3. On `{"type":"auth_ok"}`, transitions to `connected` state and optionally sends `{"type":"subscribe","lat":…,"lng":…,"radiusKm":…}` if a locality is selected.
4. Handles server pings (`{"type":"ping"}`) with a `pong` response.
5. On close, reconnects with exponential backoff (1 s → 16 s max).

Events received and how `useIncidents` processes them:

| Event | Action |
|---|---|
| `incident.resolved` | Marks the incident `resolvedAt` in the local query cache |
| `incident.hidden` | Can be used to remove the incident from the active list |

---

## NPM Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run unit tests with Vitest (jsdom) |
| `npm run lint` | ESLint |

---

## Testing

```bash
npm test
```

Unit tests use Vitest + jsdom. Setup file: `src/test/setup.ts`.

To mock API calls in tests:

```ts
vi.mock('../../lib/api', () => ({
  api: { get: vi.fn(), adminPost: vi.fn() },
}));
```

---

## Production Build

```bash
npm run build
# Output: dist/
```

The `dist/` directory is a static SPA. Serve it from any CDN, Nginx, or object-storage bucket.

### Environment at build time

Vite bakes `VITE_*` variables into the bundle at build time. Set them before building:

```bash
VITE_USE_MOCK=false \
VITE_API_BASE_URL=https://api.yourdomain.com \
VITE_WS_URL=wss://api.yourdomain.com/ws \
npm run build
```

### Nginx example

```nginx
server {
    listen 443 ssl;
    server_name dashboard.yourdomain.com;

    root /var/www/balagh-dashboard;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /ws {
        proxy_pass         http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }
}
```

### GitHub Pages

The Vite config supports `base: '/blgh/'` when the `GITHUB_PAGES=true` env var is set. Configure this in the GitHub Actions workflow before building.
