import { pool } from '../../db/client';
import { haversineKm } from '../../lib/geo';
import {
  ACTIVE_RADIUS_KM,
  ACTIVE_WINDOW_MIN,
  ACTIVE_THRESHOLD,
  WATCH_RADIUS_KM,
  WATCH_WINDOW_MIN,
} from '../../lib/constants';
import type { StatusResponse } from '../../lib/contracts';

interface StatusIncidentRow {
  lat: number;
  lng: number;
  confirmations: number;
  created_at: string;
}

// Pure function — exported for unit testing.
// Logic ported verbatim from MockStatusRepo.ts.
export function calculateStatus(
  incidents: StatusIncidentRow[],
  lat: number,
  lng: number,
  now = Date.now(),
): StatusResponse {
  const activeWindowMs = ACTIVE_WINDOW_MIN * 60 * 1000;
  const watchWindowMs = WATCH_WINDOW_MIN * 60 * 1000;

  const nearActive = incidents.filter(
    i =>
      haversineKm(lat, lng, i.lat, i.lng) <= ACTIVE_RADIUS_KM &&
      now - new Date(i.created_at).getTime() <= activeWindowMs &&
      i.confirmations >= 1,
  );

  if (nearActive.length >= ACTIVE_THRESHOLD) {
    return { state: 'active', reason: 'multiple_verified_nearby' };
  }

  const nearWatch = incidents.filter(
    i =>
      haversineKm(lat, lng, i.lat, i.lng) <= WATCH_RADIUS_KM &&
      now - new Date(i.created_at).getTime() <= watchWindowMs,
  );

  if (nearWatch.length >= 1) {
    return { state: 'watch', reason: 'incident_nearby' };
  }

  return { state: 'calm', reason: 'no_nearby_incidents' };
}

export async function getStatus(
  deviceId: string,
  lat: number,
  lng: number,
): Promise<StatusResponse> {
  // Upsert device location so the notification fan-out knows where devices are
  await pool.query(
    `INSERT INTO devices (device_id, last_lat, last_lng, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (device_id) DO UPDATE
       SET last_lat = EXCLUDED.last_lat,
           last_lng = EXCLUDED.last_lng,
           updated_at = now()`,
    [deviceId, lat, lng],
  );

  // Pre-filter with ST_DWithin to avoid loading the full incidents table,
  // then use haversineKm for exact distance (matches frontend behaviour).
  const { rows } = await pool.query<StatusIncidentRow>(
    `SELECT lat, lng, confirmations, created_at
     FROM incidents
     WHERE resolved_at IS NULL
       AND NOT hidden
       AND ST_DWithin(
         geom,
         ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography,
         $3::float8 * 1000
       )`,
    [lat, lng, WATCH_RADIUS_KM],
  );

  return calculateStatus(rows, lat, lng);
}
