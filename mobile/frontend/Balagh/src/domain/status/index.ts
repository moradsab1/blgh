/**
 * Safety status computation — §5.6 rules:
 *
 *  calm   — no active alerts within 3 km
 *  watch  — ≥1 active alert within 3 km in the last 60 min
 *  active — ≥3 alerts within 1 km in the last 15 min
 *
 * "Active" means not yet resolved (resolvedAt is absent).
 * Locality coordinates are used as the reference point when the user has not
 * granted location permission (userLat/userLng are null).
 */

import type { Incident, SafetyState } from '../../core/types';
import type { Locality } from '../../core/types';

// ── Haversine distance ────────────────────────────────────────────────────────

const R_KM = 6371; // Earth radius in km

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_KM * c;
}

// ── Status computation ────────────────────────────────────────────────────────

/**
 * Compute the current safety state for the user's position.
 *
 * @param incidents  All incidents from the db (resolved ones are excluded).
 * @param userLat    User GPS latitude, or null if permission not granted.
 * @param userLng    User GPS longitude, or null if permission not granted.
 * @param locality   The selected locality; used as fallback when GPS is null.
 */
export function computeStatus(
  incidents: Incident[],
  userLat: number | null,
  userLng: number | null,
  locality: Pick<Locality, 'lat' | 'lng'> | null,
): SafetyState {
  // Determine reference coordinates
  const refLat = userLat ?? locality?.lat ?? null;
  const refLng = userLng ?? locality?.lng ?? null;

  // Without a reference point we cannot compute distance → fall back to calm
  if (refLat === null || refLng === null) {
    return 'calm';
  }

  const now = Date.now();
  const MIN_15 = 15 * 60 * 1000;
  const MIN_60 = 60 * 60 * 1000;
  const KM_1 = 1;
  const KM_3 = 3;

  // Filter to non-resolved incidents only
  const active = incidents.filter(i => !i.resolvedAt);

  // ── Active check: ≥3 incidents within 1 km in the last 15 min ──
  const activeWindow = active.filter(i => {
    const age = now - new Date(i.createdAt).getTime();
    if (age > MIN_15) return false;
    const dist = haversineKm(refLat, refLng, i.lat, i.lng);
    return dist <= KM_1;
  });

  if (activeWindow.length >= 3) {
    return 'active';
  }

  // ── Watch check: ≥1 active incident within 3 km in the last 60 min ──
  const watchWindow = active.filter(i => {
    const age = now - new Date(i.createdAt).getTime();
    if (age > MIN_60) return false;
    const dist = haversineKm(refLat, refLng, i.lat, i.lng);
    return dist <= KM_3;
  });

  if (watchWindow.length >= 1) {
    return 'watch';
  }

  return 'calm';
}
