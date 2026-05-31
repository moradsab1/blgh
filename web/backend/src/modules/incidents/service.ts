import { pool } from '../../db/client';
import { notFound } from '../../lib/errors';
import type { Incident, Comment, Category, Severity } from '../../lib/contracts';

// ── Row types ────────────────────────────────────────────────────────────────

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
  hidden: boolean;
  confirmations: number;
  denials: number;
  comment_count: number;
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

// ── Row → domain mappers ─────────────────────────────────────────────────────

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
    myVote: null, // operators are not voting devices
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

// ── Filter types ─────────────────────────────────────────────────────────────

export type StatusFilter = 'active' | 'resolved' | 'hidden' | 'all';

export interface IncidentFilters {
  status?: StatusFilter;
  severity?: string[];
  category?: string[];
  localityId?: string;
  bbox?: [number, number, number, number]; // minLng, minLat, maxLng, maxLat
  since?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function listIncidents(filters: IncidentFilters): Promise<Incident[]> {
  const params: unknown[] = [];
  const wheres: string[] = [];

  // Helper: push value and return its $N placeholder
  function addParam(value: unknown): string {
    params.push(value);
    return `$${params.length}`;
  }

  // status filter
  const status = filters.status ?? 'active';
  if (status === 'active') {
    wheres.push('i.hidden = false AND i.resolved_at IS NULL');
  } else if (status === 'resolved') {
    wheres.push('i.resolved_at IS NOT NULL');
  } else if (status === 'hidden') {
    wheres.push('i.hidden = true');
  }
  // 'all' → no predicate

  if (filters.severity && filters.severity.length > 0) {
    wheres.push(`i.severity = ANY(${addParam(filters.severity)})`);
  }

  if (filters.category && filters.category.length > 0) {
    wheres.push(`i.category = ANY(${addParam(filters.category)})`);
  }

  if (filters.localityId) {
    wheres.push(`i.locality_id = ${addParam(filters.localityId)}`);
  }

  if (filters.since) {
    wheres.push(`i.created_at >= ${addParam(filters.since)}`);
  }

  if (filters.bbox) {
    const [minLng, minLat, maxLng, maxLat] = filters.bbox;
    const p1 = addParam(minLng);
    const p2 = addParam(minLat);
    const p3 = addParam(maxLng);
    const p4 = addParam(maxLat);
    wheres.push(
      `ST_Intersects(i.geom, ST_MakeEnvelope(${p1}::float8, ${p2}::float8, ${p3}::float8, ${p4}::float8, 4326)::geography)`,
    );
  }

  if (filters.lat !== undefined && filters.lng !== undefined && filters.radiusKm !== undefined) {
    const pLng = addParam(filters.lng);
    const pLat = addParam(filters.lat);
    const pR = addParam(filters.radiusKm);
    wheres.push(
      `ST_DWithin(i.geom, ST_SetSRID(ST_MakePoint(${pLng}::float8, ${pLat}::float8), 4326)::geography, ${pR}::float8 * 1000)`,
    );
  }

  const where = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';

  const { rows } = await pool.query<IncidentRow>(
    `SELECT
       i.id, i.ref, i.category, i.severity, i.description,
       i.lat, i.lng, i.locality_id, i.created_at, i.resolved_at,
       i.hidden, i.confirmations, i.denials, i.comment_count
     FROM incidents i
     ${where}
     ORDER BY i.created_at DESC, i.id DESC`,
    params,
  );
  return rows.map(rowToIncident);
}

export async function getIncident(id: string): Promise<Incident> {
  const { rows } = await pool.query<IncidentRow>(
    `SELECT
       id, ref, category, severity, description,
       lat, lng, locality_id, created_at, resolved_at,
       hidden, confirmations, denials, comment_count
     FROM incidents
     WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) throw notFound('Incident not found');
  return rowToIncident(rows[0]);
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

export async function resolveIncident(id: string): Promise<void> {
  const { rowCount } = await pool.query(
    "UPDATE incidents SET resolved_at = now() WHERE id = $1 AND resolved_at IS NULL",
    [id],
  );
  if (rowCount === 0) throw notFound('Incident not found or already resolved');
}

export async function hideIncident(id: string): Promise<void> {
  const { rowCount } = await pool.query(
    'UPDATE incidents SET hidden = true WHERE id = $1',
    [id],
  );
  if (rowCount === 0) throw notFound('Incident not found');
}
