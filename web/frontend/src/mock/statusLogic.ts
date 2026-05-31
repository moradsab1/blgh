import type { Incident, StatusResponse } from '../lib/contracts';

const ACTIVE_RADIUS_KM = 1;
const ACTIVE_WINDOW_MIN = 15;
const ACTIVE_THRESHOLD = 3;
const WATCH_RADIUS_KM = 3;
const WATCH_WINDOW_MIN = 60;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateStatus(
  incidents: Incident[],
  lat: number,
  lng: number,
  now = Date.now(),
): StatusResponse {
  const active = incidents.filter(
    (i) =>
      haversineKm(lat, lng, i.lat, i.lng) <= ACTIVE_RADIUS_KM &&
      now - new Date(i.createdAt).getTime() <= ACTIVE_WINDOW_MIN * 60_000 &&
      i.confirmations >= 1,
  );
  if (active.length >= ACTIVE_THRESHOLD) return { state: 'active', reason: 'multiple_verified_nearby' };

  const watch = incidents.filter(
    (i) =>
      haversineKm(lat, lng, i.lat, i.lng) <= WATCH_RADIUS_KM &&
      now - new Date(i.createdAt).getTime() <= WATCH_WINDOW_MIN * 60_000,
  );
  if (watch.length >= 1) return { state: 'watch', reason: 'incident_nearby' };

  return { state: 'calm', reason: 'no_nearby_incidents' };
}
