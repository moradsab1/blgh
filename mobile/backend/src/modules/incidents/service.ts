import { pool } from '../../db/client';
import { deriveEmojis } from '../../lib/identity';
import { notFound, conflict, AppError } from '../../lib/errors';
import { WATCH_RADIUS_KM } from '../../lib/constants';
import type { Incident, Comment, AppNotification, Category, Severity } from '../../lib/contracts';

// Ported verbatim from MockIncidentRepo.ts
export const SEVERITY_MAP: Record<string, Severity> = {
  GUNFIRE: 'critical',
  STABBING: 'critical',
  ASSAULT: 'high',
  ROBBERY: 'high',
  SUSPICIOUS: 'medium',
  OTHER: 'medium',
};

// ── Row types ───────────────────────────────────────────────────────────────

interface IncidentRow {
  id: string;
  ref: string;
  category: string;
  severity: string;
  description: string | null;
  lat: number;
  lng: number;
  locality_id: string | null;
  created_at: string;
  resolved_at: string | null;
  confirmations: number;
  denials: number;
  comment_count: number;
  my_vote?: string | null;
}

interface CommentRow {
  id: string;
  incident_id: string;
  emoji0: string;
  emoji1: string;
  emoji2: string;
  body: string;
  created_at: string;
}

interface NotificationRow {
  id: string;
  device_id: string;
  type: string;
  title: string;
  body: string;
  incident_ref: string | null;
  read: boolean;
  created_at: string;
}

// ── Row → domain mappers ────────────────────────────────────────────────────

function rowToIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    ref: row.ref,
    category: row.category as Category,
    severity: row.severity as Severity,
    description: row.description ?? undefined,
    lat: row.lat,
    lng: row.lng,
    localityId: row.locality_id ?? '',
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
    confirmations: row.confirmations,
    denials: row.denials,
    commentCount: row.comment_count,
    myVote: (row.my_vote as 'confirm' | 'deny' | null) ?? null,
  };
}

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    incidentId: row.incident_id,
    identityTag: [row.emoji0, row.emoji1, row.emoji2],
    body: row.body,
    createdAt: row.created_at,
  };
}

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type as AppNotification['type'],
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read,
    incidentRef: row.incident_ref ?? undefined,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isPgUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === '23505'
  );
}

async function upsertDevice(deviceId: string, lat: number, lng: number): Promise<void> {
  await pool.query(
    `INSERT INTO devices (device_id, last_lat, last_lng, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (device_id) DO UPDATE
       SET last_lat = EXCLUDED.last_lat,
           last_lng = EXCLUDED.last_lng,
           updated_at = now()`,
    [deviceId, lat, lng],
  );
}

// ── Service functions ────────────────────────────────────────────────────────

export async function getIncidents(
  deviceId: string,
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<Incident[]> {
  const { rows } = await pool.query<IncidentRow>(
    `SELECT
       i.id, i.ref, i.category, i.severity, i.description,
       i.lat, i.lng, i.locality_id, i.created_at, i.resolved_at,
       i.confirmations, i.denials, i.comment_count,
       v.vote AS my_vote
     FROM incidents i
     LEFT JOIN votes v
       ON v.incident_id = i.id AND v.device_id = $4
     WHERE
       ST_DWithin(
         i.geom,
         ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography,
         $3::float8 * 1000
       )
       AND NOT i.hidden
       AND i.resolved_at IS NULL
     ORDER BY i.created_at DESC`,
    [lat, lng, radiusKm, deviceId],
  );
  return rows.map(rowToIncident);
}

export async function getIncident(deviceId: string, id: string): Promise<Incident> {
  const { rows } = await pool.query<IncidentRow>(
    `SELECT
       i.id, i.ref, i.category, i.severity, i.description,
       i.lat, i.lng, i.locality_id, i.created_at, i.resolved_at,
       i.confirmations, i.denials, i.comment_count,
       v.vote AS my_vote
     FROM incidents i
     LEFT JOIN votes v
       ON v.incident_id = i.id AND v.device_id = $2
     WHERE i.id = $1 AND NOT i.hidden`,
    [id, deviceId],
  );
  if (rows.length === 0) throw notFound('Incident not found');
  return rowToIncident(rows[0]);
}

export interface SubmitResult {
  id: string;
  ref: string;
  fanOut: Array<{ deviceId: string; notification: AppNotification }>;
}

export async function submitReport(
  deviceId: string,
  category: string,
  lat: number,
  lng: number,
  description?: string,
  idempotencyKey?: string,
): Promise<SubmitResult> {
  // Idempotency check — safe for offline-replay
  if (idempotencyKey) {
    const { rows } = await pool.query<{ id: string; ref: string }>(
      'SELECT id, ref FROM incidents WHERE idempotency_key = $1',
      [idempotencyKey],
    );
    if (rows.length > 0) {
      return { id: rows[0].id, ref: rows[0].ref, fanOut: [] };
    }
  }

  // Generate BLG-XXXXXX ref from DB sequence
  const { rows: [seqRow] } = await pool.query<{ nextval: string }>(
    "SELECT nextval('incident_ref_seq') AS nextval",
  );
  const seq = Number(seqRow.nextval);
  const ref = `BLG-${seq.toString(36).toUpperCase().padStart(6, '0')}`;

  const severity = SEVERITY_MAP[category] ?? 'medium';

  // Insert incident — geom column is auto-generated from lat/lng by Postgres
  const { rows: [row] } = await pool.query<IncidentRow>(
    `INSERT INTO incidents
       (ref, idempotency_key, device_id, category, severity, description, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING
       id, ref, category, severity, description, lat, lng, locality_id,
       created_at, resolved_at, confirmations, denials, comment_count`,
    [ref, idempotencyKey ?? null, deviceId, category, severity, description ?? null, lat, lng],
  );

  // Persist device location for future notification fan-out
  await upsertDevice(deviceId, lat, lng);

  // Fan-out: notify devices that have checked status near this incident
  const { rows: nearbyDevices } = await pool.query<{ device_id: string }>(
    `SELECT device_id FROM devices
     WHERE last_lat IS NOT NULL
       AND last_lng IS NOT NULL
       AND device_id != $1
       AND ST_DWithin(
         ST_SetSRID(ST_MakePoint(last_lng::float8, last_lat::float8), 4326)::geography,
         ST_SetSRID(ST_MakePoint($3::float8, $2::float8), 4326)::geography,
         $4::float8 * 1000
       )`,
    [deviceId, lat, lng, WATCH_RADIUS_KM],
  );

  const fanOut: Array<{ deviceId: string; notification: AppNotification }> = [];

  for (const { device_id } of nearbyDevices) {
    const { rows: [notifRow] } = await pool.query<NotificationRow>(
      `INSERT INTO notifications (device_id, type, title, body, incident_ref)
       VALUES ($1, 'nearby', 'بلاغ جديد', $2, $3)
       RETURNING id, device_id, type, title, body, incident_ref, read, created_at`,
      [device_id, `حادثة قريبة — ${ref}`, ref],
    );
    fanOut.push({ deviceId: device_id, notification: rowToNotification(notifRow) });
  }

  // Attach myVote=null since this is a new report (reporter hasn't voted)
  return { id: row.id, ref: row.ref, fanOut };
}

export async function vote(
  deviceId: string,
  incidentId: string,
  voteValue: 'confirm' | 'deny',
): Promise<Incident> {
  // Verify incident exists
  const { rows: existing } = await pool.query(
    'SELECT id FROM incidents WHERE id = $1 AND NOT hidden',
    [incidentId],
  );
  if (existing.length === 0) throw notFound('Incident not found');

  // Insert vote — UNIQUE(incident_id, device_id) enforced at DB level
  try {
    await pool.query(
      'INSERT INTO votes (incident_id, device_id, vote) VALUES ($1, $2, $3)',
      [incidentId, deviceId, voteValue],
    );
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      throw conflict('DUPLICATE_VOTE', 'You have already voted on this incident');
    }
    throw err;
  }

  // Increment the right counter and return the updated row
  const { rows: [updated] } = await pool.query<IncidentRow>(
    `UPDATE incidents
     SET confirmations = confirmations + $2,
         denials       = denials       + $3
     WHERE id = $1
     RETURNING
       id, ref, category, severity, description, lat, lng, locality_id,
       created_at, resolved_at, confirmations, denials, comment_count`,
    [
      incidentId,
      voteValue === 'confirm' ? 1 : 0,
      voteValue === 'deny' ? 1 : 0,
    ],
  );

  return { ...rowToIncident(updated), myVote: voteValue };
}

export async function getComments(incidentId: string): Promise<Comment[]> {
  const { rows } = await pool.query<CommentRow>(
    `SELECT id, incident_id, emoji0, emoji1, emoji2, body, created_at
     FROM comments
     WHERE incident_id = $1
     ORDER BY created_at ASC`,
    [incidentId],
  );
  return rows.map(rowToComment);
}

export async function addComment(
  deviceId: string,
  incidentId: string,
  body: string,
): Promise<Comment> {
  const { rows: exists } = await pool.query(
    'SELECT id FROM incidents WHERE id = $1 AND NOT hidden',
    [incidentId],
  );
  if (exists.length === 0) throw notFound('Incident not found');

  const [emoji0, emoji1, emoji2] = deriveEmojis(deviceId);
  const trimmedBody = body.slice(0, 280);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [row] } = await client.query<CommentRow>(
      `INSERT INTO comments (incident_id, device_id, emoji0, emoji1, emoji2, body)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, incident_id, emoji0, emoji1, emoji2, body, created_at`,
      [incidentId, deviceId, emoji0, emoji1, emoji2, trimmedBody],
    );

    await client.query(
      'UPDATE incidents SET comment_count = comment_count + 1 WHERE id = $1',
      [incidentId],
    );

    await client.query('COMMIT');
    return rowToComment(row);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Exported for admin module (Phase 3)
export async function resolveIncident(id: string): Promise<void> {
  const { rowCount } = await pool.query(
    "UPDATE incidents SET resolved_at = now() WHERE id = $1 AND resolved_at IS NULL",
    [id],
  );
  if (rowCount === 0) throw notFound('Incident not found');
}

export async function hideIncident(id: string): Promise<void> {
  const { rowCount } = await pool.query(
    'UPDATE incidents SET hidden = true WHERE id = $1',
    [id],
  );
  if (rowCount === 0) throw notFound('Incident not found');
}

// Re-exported for status change broadcast (Phase 3)
export async function getIncidentById(id: string): Promise<IncidentRow | null> {
  const { rows } = await pool.query<IncidentRow>(
    `SELECT lat, lng, confirmations FROM incidents WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
