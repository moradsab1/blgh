# Deployment Guide

## Prerequisites

- PostgreSQL 16 with PostGIS 3.4 extension
- Node.js 22
- Environment variables (copy `.env.example` → `.env` and fill in values)

## First-time Setup

```bash
# Start the database (local dev)
docker-compose up -d

# Install dependencies
npm ci

# Run migrations
npm run migrate

# Seed localities (18 cities)
npm run seed
```

## Running

```bash
# Development (hot-reload)
npm run dev

# Production (Docker)
docker build -t balagh-backend .
docker run -p 3000:3000 --env-file .env balagh-backend
```

## Smoke-test Checklist

Run these after every deploy to verify the service is healthy:

```bash
BASE=http://localhost:3000
DEVICE=test-device-$(date +%s)

# 1. Health check
curl -s $BASE/health
# Expected: {"ok":true,"db":"ok"}

# 2. Localities seed
curl -s "$BASE/localities?q=" | jq length
# Expected: 18

# 3. Submit incident
REF=$(curl -s -X POST $BASE/incidents \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: $DEVICE" \
  -d '{"category":"SUSPICIOUS","lat":32.51,"lng":35.15}' | jq -r .ref)
echo "Created: $REF"

# 4. List incidents — new one appears
curl -s "$BASE/incidents?lat=32.51&lng=35.15&radiusKm=5" \
  -H "X-Device-Id: $DEVICE" | jq '.[0].ref'
# Expected: "$REF"

# 5. Status
curl -s "$BASE/status?lat=32.51&lng=35.15" \
  -H "X-Device-Id: $DEVICE"
# Expected: {"state":"watch","reason":"incident_nearby"} or "calm"

# 6. Notifications inbox (empty for fresh device)
curl -s $BASE/notifications -H "X-Device-Id: fresh-device-abc"
# Expected: []

# 7. Follow-up submission
curl -s -X POST "$BASE/follow-up/$REF" \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: $DEVICE" \
  -d '{"vehicle":"yes","direction":"north"}' | jq .
# Expected: {"ok":true}

# 8. Rate limit (submit 6 incidents rapidly from same IP)
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST $BASE/incidents \
    -H "Content-Type: application/json" \
    -H "X-Device-Id: $DEVICE-$i" \
    -d '{"category":"OTHER","lat":32.51,"lng":35.15}'
done
# Expected: first 5 return 201, 6th returns 429

# 9. Version gate
curl -s -X GET $BASE/health -H "X-App-Version: 0.0.1" | jq .
# Expected: {"code":"UPDATE_REQUIRED","message":"Please update the app"} (status 426)
```

## WebSocket Smoke-test

```bash
# Install wscat: npm install -g wscat
wscat -c "ws://localhost:3000/ws" -H "X-Device-Id: ws-test-device"
# After connecting, send:
{"type":"subscribe","lat":32.51,"lng":35.15,"radiusKm":5}
# Then from another terminal submit an incident — you should receive incident.created
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | `3000` | HTTP listen port |
| `ADMIN_TOKEN` | Yes | — | Bearer token for admin routes |
| `MIN_APP_VERSION` | No | `1.0.0` | Minimum accepted client version |
| `LOG_LEVEL` | No | `info` | Pino log level |

## Production Notes

- Run behind a reverse proxy (nginx/Caddy) that handles TLS
- Use a managed PostgreSQL service (Supabase, Neon, RDS) with PITR backups enabled
- Set `NODE_ENV=production` to disable pino-pretty transport
- `ADMIN_TOKEN` must be a strong random secret (e.g. `openssl rand -hex 32`)
