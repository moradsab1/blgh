import { vi, describe, it, expect } from 'vitest';

// Prevent config.ts from throwing "DATABASE_URL required" in unit tests.
// calculateStatus is pure and never calls the pool.
vi.mock('../../src/db/client', () => ({ pool: { query: vi.fn() }, db: {} }));
import { calculateStatus } from '../../src/modules/status/service';
import {
  ACTIVE_RADIUS_KM,
  ACTIVE_THRESHOLD,
  WATCH_RADIUS_KM,
} from '../../src/lib/constants';

// Fixed "now" so time-window checks are deterministic
const NOW = new Date('2024-06-01T12:00:00Z').getTime();

// Helper to create a fake incident within a given km of (32.51, 35.15)
function makeIncident(
  distanceKm: number,
  minutesAgo: number,
  confirmations = 0,
): { lat: number; lng: number; confirmations: number; created_at: string } {
  // Shift latitude by distanceKm / 111 degrees (rough equatorial approximation)
  const lat = 32.51 + distanceKm / 111;
  const createdAt = new Date(NOW - minutesAgo * 60 * 1000).toISOString();
  return { lat, lng: 35.15, confirmations, created_at: createdAt };
}

describe('calculateStatus', () => {
  const CENTER = { lat: 32.51, lng: 35.15 };

  it('returns calm when there are no incidents', () => {
    expect(calculateStatus([], CENTER.lat, CENTER.lng, NOW)).toEqual({
      state: 'calm',
      reason: 'no_nearby_incidents',
    });
  });

  it('returns watch for a single unconfirmed incident within watch radius', () => {
    const incident = makeIncident(WATCH_RADIUS_KM - 0.5, 30, 0);
    expect(calculateStatus([incident], CENTER.lat, CENTER.lng, NOW)).toEqual({
      state: 'watch',
      reason: 'incident_nearby',
    });
  });

  it('does not return watch for an incident outside watch radius', () => {
    const incident = makeIncident(WATCH_RADIUS_KM + 0.5, 30, 0);
    expect(calculateStatus([incident], CENTER.lat, CENTER.lng, NOW)).toEqual({
      state: 'calm',
      reason: 'no_nearby_incidents',
    });
  });

  it('does not return watch for an expired incident', () => {
    const incident = makeIncident(WATCH_RADIUS_KM - 0.5, 61, 0); // 61 min ago > 60 min window
    expect(calculateStatus([incident], CENTER.lat, CENTER.lng, NOW)).toEqual({
      state: 'calm',
      reason: 'no_nearby_incidents',
    });
  });

  it('returns active when ACTIVE_THRESHOLD confirmed incidents are within active radius', () => {
    const incidents = Array.from({ length: ACTIVE_THRESHOLD }, () =>
      makeIncident(ACTIVE_RADIUS_KM - 0.1, 5, 1),
    );
    expect(calculateStatus(incidents, CENTER.lat, CENTER.lng, NOW)).toEqual({
      state: 'active',
      reason: 'multiple_verified_nearby',
    });
  });

  it('does not return active when incidents lack confirmations', () => {
    const incidents = Array.from({ length: ACTIVE_THRESHOLD }, () =>
      makeIncident(ACTIVE_RADIUS_KM - 0.1, 5, 0), // confirmations = 0
    );
    const result = calculateStatus(incidents, CENTER.lat, CENTER.lng, NOW);
    // Should be watch (within watch radius) not active
    expect(result.state).not.toBe('active');
  });

  it('does not return active when confirmed incidents are outside active radius', () => {
    const incidents = Array.from({ length: ACTIVE_THRESHOLD }, () =>
      makeIncident(ACTIVE_RADIUS_KM + 0.5, 5, 2), // outside active radius
    );
    const result = calculateStatus(incidents, CENTER.lat, CENTER.lng, NOW);
    expect(result.state).not.toBe('active');
  });

  it('returns active when count is exactly ACTIVE_THRESHOLD', () => {
    const incidents = Array.from({ length: ACTIVE_THRESHOLD }, () =>
      makeIncident(0.2, 5, 1),
    );
    expect(calculateStatus(incidents, CENTER.lat, CENTER.lng, NOW).state).toBe('active');
  });
});

describe('SEVERITY_MAP', () => {
  it('exports the correct severity mapping', async () => {
    const { SEVERITY_MAP } = await import('../../src/modules/incidents/service');
    expect(SEVERITY_MAP['GUNFIRE']).toBe('critical');
    expect(SEVERITY_MAP['STABBING']).toBe('critical');
    expect(SEVERITY_MAP['ASSAULT']).toBe('high');
    expect(SEVERITY_MAP['ROBBERY']).toBe('high');
    expect(SEVERITY_MAP['SUSPICIOUS']).toBe('medium');
    expect(SEVERITY_MAP['OTHER']).toBe('medium');
  });
});
