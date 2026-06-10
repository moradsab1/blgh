/**
 * Unit tests for src/domain/status/index.ts
 *
 * Covers all §5.6 rules:
 *  calm   — no active alerts within 3 km
 *  watch  — ≥1 active alert within 3 km in the last 60 min
 *  active — ≥3 verified (≥1 confirmation) alerts within 1 km in the last 15 min
 */

import { computeStatus, haversineKm } from '../../src/domain/status';
import { formatNumber } from '../../src/core/theme/tokens';
import type { Incident, Locality } from '../../src/core/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Reference user position — Umm al-Fahm town centre. */
const USER_LAT = 32.5139;
const USER_LNG = 35.1566;

/** A locality that matches the user's position. */
const LOCALITY: Pick<Locality, 'lat' | 'lng'> = {
  lat: USER_LAT,
  lng: USER_LNG,
};

let _idSeq = 1;

/**
 * Build a minimal Incident placed at the given coordinates with the given age.
 *
 * @param lat            Latitude
 * @param lng            Longitude
 * @param ageMinutes     How many minutes ago the incident was created
 * @param confirmations  Number of confirmations (default 0)
 * @param resolvedAt     Optional ISO string if the incident is resolved
 */
function makeIncident(
  lat: number,
  lng: number,
  ageMinutes: number,
  confirmations = 0,
  resolvedAt?: string,
): Incident {
  const id = String(_idSeq++);
  return {
    id,
    ref: `BLG-TEST-${id}`,
    category: 'SUSPICIOUS',
    severity: 'medium',
    lat,
    lng,
    localityId: 'umm-al-fahm',
    createdAt: new Date(Date.now() - ageMinutes * 60 * 1000).toISOString(),
    confirmations,
    denials: 0,
    myVote: null,
    ...(resolvedAt ? { resolvedAt } : {}),
  };
}

/**
 * Return coordinates that are approximately `km` kilometres north of the
 * reference user position (simple linear approximation — fine for test distances).
 */
function coordsAtKm(km: number): { lat: number; lng: number } {
  // 1 degree latitude ≈ 111.32 km
  return {
    lat: USER_LAT + km / 111.32,
    lng: USER_LNG,
  };
}

// ── haversineKm tests ────────────────────────────────────────────────────────

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm(32.5, 35.1, 32.5, 35.1)).toBe(0);
  });

  it('returns a reasonable distance between two known points', () => {
    // Umm al-Fahm → Nazareth ≈ 21 km
    const dist = haversineKm(32.5139, 35.1566, 32.6996, 35.3034);
    expect(dist).toBeGreaterThan(18);
    expect(dist).toBeLessThan(25);
  });

  it('is symmetric', () => {
    const a = haversineKm(32.5, 35.1, 32.6, 35.2);
    const b = haversineKm(32.6, 35.2, 32.5, 35.1);
    expect(Math.abs(a - b)).toBeLessThan(0.001);
  });
});

// ── computeStatus tests ──────────────────────────────────────────────────────

describe('computeStatus', () => {
  beforeEach(() => {
    _idSeq = 1; // reset ID counter so tests are deterministic
  });

  // ── calm ────────────────────────────────────────────────────────────────

  it('returns calm when there are no incidents', () => {
    expect(computeStatus([], USER_LAT, USER_LNG, LOCALITY)).toBe('calm');
  });

  it('returns calm when all incidents are resolved', () => {
    const resolved = makeIncident(
      USER_LAT,
      USER_LNG,
      5,
      2,
      new Date().toISOString(),
    );
    expect(computeStatus([resolved], USER_LAT, USER_LNG, LOCALITY)).toBe('calm');
  });

  it('returns calm when active incident is outside the 3 km watch radius', () => {
    const { lat, lng } = coordsAtKm(3.5); // 3.5 km away → outside 3 km window
    const incident = makeIncident(lat, lng, 10, 0);
    expect(computeStatus([incident], USER_LAT, USER_LNG, LOCALITY)).toBe('calm');
  });

  it('returns calm when active incident within 3 km is older than 60 min', () => {
    // 0.5 km away but 61 minutes old → outside the 60-min watch window
    const { lat, lng } = coordsAtKm(0.5);
    const incident = makeIncident(lat, lng, 61, 0);
    expect(computeStatus([incident], USER_LAT, USER_LNG, LOCALITY)).toBe('calm');
  });

  // ── watch ───────────────────────────────────────────────────────────────

  it('returns watch when ≥1 active incident is within 3 km and within 60 min', () => {
    const { lat, lng } = coordsAtKm(1.5); // 1.5 km away
    const incident = makeIncident(lat, lng, 30, 0); // 30 min ago
    expect(computeStatus([incident], USER_LAT, USER_LNG, LOCALITY)).toBe('watch');
  });

  it('returns watch (not active) when fewer than 3 verified incidents are within 1 km', () => {
    // 2 verified incidents within 1 km in last 15 min — not enough for active
    const nearby = coordsAtKm(0.5);
    const i1 = makeIncident(nearby.lat, nearby.lng, 5, 1);
    const i2 = makeIncident(nearby.lat, nearby.lng, 8, 1);
    expect(computeStatus([i1, i2], USER_LAT, USER_LNG, LOCALITY)).toBe('watch');
  });

  it('returns watch (not active) when ≥3 verified incidents are within 1 km but older than 15 min', () => {
    // All 3 are 16 minutes old — beyond the 15-min active window
    const nearby = coordsAtKm(0.5);
    const i1 = makeIncident(nearby.lat, nearby.lng, 16, 1);
    const i2 = makeIncident(nearby.lat, nearby.lng, 17, 1);
    const i3 = makeIncident(nearby.lat, nearby.lng, 18, 1);
    // They ARE within the 60-min watch window, so should be watch not calm
    expect(computeStatus([i1, i2, i3], USER_LAT, USER_LNG, LOCALITY)).toBe('watch');
  });

  // ── active ──────────────────────────────────────────────────────────────

  it('returns active when ≥3 verified incidents are within 1 km in the last 15 min', () => {
    const nearby = coordsAtKm(0.5);
    const i1 = makeIncident(nearby.lat, nearby.lng, 5, 1);
    const i2 = makeIncident(nearby.lat, nearby.lng, 8, 2);
    const i3 = makeIncident(nearby.lat, nearby.lng, 12, 1);
    expect(computeStatus([i1, i2, i3], USER_LAT, USER_LNG, LOCALITY)).toBe('active');
  });

  it('does NOT return active when incidents have 0 confirmations (unverified)', () => {
    // 3 unverified incidents near and recent → cannot trigger active
    const nearby = coordsAtKm(0.3);
    const i1 = makeIncident(nearby.lat, nearby.lng, 5, 0);
    const i2 = makeIncident(nearby.lat, nearby.lng, 7, 0);
    const i3 = makeIncident(nearby.lat, nearby.lng, 10, 0);
    // Still within watch window, so watch (not calm)
    const result = computeStatus([i1, i2, i3], USER_LAT, USER_LNG, LOCALITY);
    expect(result).not.toBe('active');
    expect(result).toBe('watch');
  });

  // ── locality fallback ────────────────────────────────────────────────────

  it('falls back to locality coords when userLat/userLng are null', () => {
    // Incident close to the locality centre → should trigger watch
    const nearby = coordsAtKm(0.5);
    const incident = makeIncident(nearby.lat, nearby.lng, 10, 0);
    expect(computeStatus([incident], null, null, LOCALITY)).toBe('watch');
  });

  it('returns calm when userLat/userLng are null and locality is also null', () => {
    const nearby = coordsAtKm(0.5);
    const incident = makeIncident(nearby.lat, nearby.lng, 10, 0);
    // No reference point at all
    expect(computeStatus([incident], null, null, null)).toBe('calm');
  });

  // ── resolved incidents are ignored ───────────────────────────────────────

  it('ignores resolved incidents when computing status', () => {
    const nearby = coordsAtKm(0.3);
    // 3 resolved + 3 unresolved non-verified within 15 min → watch (not active)
    const r1 = makeIncident(nearby.lat, nearby.lng, 5, 1, new Date().toISOString());
    const r2 = makeIncident(nearby.lat, nearby.lng, 6, 1, new Date().toISOString());
    const r3 = makeIncident(nearby.lat, nearby.lng, 7, 1, new Date().toISOString());
    // Without resolved these three unverified won't reach active
    const u1 = makeIncident(nearby.lat, nearby.lng, 5, 0);
    const u2 = makeIncident(nearby.lat, nearby.lng, 6, 0);
    const u3 = makeIncident(nearby.lat, nearby.lng, 7, 0);
    const result = computeStatus([r1, r2, r3, u1, u2, u3], USER_LAT, USER_LNG, LOCALITY);
    expect(result).not.toBe('active');
  });

  // ── boundary: exactly at 1 km and 3 km ──────────────────────────────────

  it('counts an incident at exactly ~1 km as being within the active zone', () => {
    // Haversine 1 km north → should be ≤ 1 km
    const { lat, lng } = coordsAtKm(0.99); // slightly under 1 km
    const i1 = makeIncident(lat, lng, 5, 1);
    const i2 = makeIncident(lat, lng, 7, 1);
    const i3 = makeIncident(lat, lng, 10, 1);
    expect(computeStatus([i1, i2, i3], USER_LAT, USER_LNG, LOCALITY)).toBe('active');
  });

  it('does not count an incident just beyond 1 km toward the active threshold', () => {
    const beyond1km = coordsAtKm(1.1);
    const i1 = makeIncident(beyond1km.lat, beyond1km.lng, 5, 1);
    const i2 = makeIncident(beyond1km.lat, beyond1km.lng, 7, 1);
    const i3 = makeIncident(beyond1km.lat, beyond1km.lng, 10, 1);
    // Within 3 km → watch, but not active because > 1 km
    const result = computeStatus([i1, i2, i3], USER_LAT, USER_LNG, LOCALITY);
    expect(result).toBe('watch');
  });
});

// ── formatNumber (tokens) test ───────────────────────────────────────────────

describe('formatNumber', () => {
  it('returns western Arabic numerals for plain numbers', () => {
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(100)).toBe('100');
  });

  it('converts Eastern Arabic-Indic digits to western Arabic', () => {
    // ٣ ٢ ٥ → 3 2 5
    expect(formatNumber('٣٢٥')).toBe('325');
  });

  it('leaves mixed strings unchanged for non-digit characters', () => {
    expect(formatNumber('abc123')).toBe('abc123');
  });

  it('handles numeric strings without conversion', () => {
    expect(formatNumber('1234')).toBe('1234');
  });
});
