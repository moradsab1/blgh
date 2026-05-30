-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Localities
CREATE TABLE IF NOT EXISTS localities (
  id        TEXT PRIMARY KEY,
  name_ar   TEXT NOT NULL,
  name_he   TEXT NOT NULL,
  name_en   TEXT NOT NULL,
  lat       FLOAT8 NOT NULL,
  lng       FLOAT8 NOT NULL
);

-- Trigram indexes for locality search (Arabic, Hebrew, English)
CREATE INDEX IF NOT EXISTS idx_localities_ar ON localities USING GIN (name_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_localities_he ON localities USING GIN (name_he gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_localities_en ON localities USING GIN (name_en gin_trgm_ops);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
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

-- GiST index for geo queries, btree index for time-based filtering
CREATE INDEX IF NOT EXISTS idx_incidents_geom    ON incidents USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents (created_at DESC);

-- Votes (one per device per incident)
CREATE TABLE IF NOT EXISTS votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id),
  device_id   TEXT NOT NULL,
  vote        TEXT NOT NULL CHECK (vote IN ('confirm', 'deny')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (incident_id, device_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id),
  device_id   TEXT NOT NULL,
  emoji0      TEXT NOT NULL,
  emoji1      TEXT NOT NULL,
  emoji2      TEXT NOT NULL,
  body        TEXT NOT NULL CHECK (char_length(body) <= 280),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Device location registry (for notification fan-out)
CREATE TABLE IF NOT EXISTS devices (
  device_id   TEXT PRIMARY KEY,
  last_lat    FLOAT8,
  last_lng    FLOAT8,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications inbox (per device)
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('nearby', 'verification', 'status', 'follow_up')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  incident_ref TEXT,
  read         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_device ON notifications (device_id, created_at DESC);

-- Follow-up structured detail
CREATE TABLE IF NOT EXISTS follow_ups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_ref TEXT NOT NULL,
  device_id    TEXT NOT NULL,
  vehicle      TEXT,
  assailants   TEXT,
  direction    TEXT,
  weapon       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
