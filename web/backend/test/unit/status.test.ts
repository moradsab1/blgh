import { describe, it, expect } from 'vitest';
import { calculateStatus } from '../../src/modules/status/service';
import { ACTIVE_THRESHOLD, ACTIVE_RADIUS_KM, WATCH_RADIUS_KM } from '../../src/lib/constants';

const NOW = Date.now();
const MINS = (n: number) => n * 60 * 1000;

// An incident row fixture at the observer's exact location
function makeIncident(
  offsetKm: number,
  ageMin: number,
  confirmations = 0,
  baseLat = 32.0,
  baseLng = 34.8,
) {
  // Rough lat offset: 1 degree ≈ 111 km
  const lat = baseLat + offsetKm / 111;
  return {
    lat,
    lng: baseLng,
    confirmations,
    created_at: new Date(NOW - MINS(ageMin)).toISOString(),
  };
}

describe('calculateStatus', () => {
  it('returns calm when there are no incidents', () => {
    expect(calculateStatus([], 32.0, 34.8, NOW)).toEqual({
      state: 'calm',
      reason: 'no_nearby_incidents',
    });
  });

  it('returns watch when there is one recent incident within watch radius', () => {
    const incident = makeIncident(WATCH_RADIUS_KM - 0.1, 30);
    expect(calculateStatus([incident], 32.0, 34.8, NOW)).toEqual({
      state: 'watch',
      reason: 'incident_nearby',
    });
  });

  it('returns calm for an incident outside the watch radius', () => {
    const incident = makeIncident(WATCH_RADIUS_KM + 1, 30);
    expect(calculateStatus([incident], 32.0, 34.8, NOW)).toEqual({
      state: 'calm',
      reason: 'no_nearby_incidents',
    });
  });

  it(`returns active when ${ACTIVE_THRESHOLD} confirmed incidents are within active radius`, () => {
    const incidents = Array.from({ length: ACTIVE_THRESHOLD }, () =>
      makeIncident(ACTIVE_RADIUS_KM - 0.05, 10, 1),
    );
    expect(calculateStatus(incidents, 32.0, 34.8, NOW)).toEqual({
      state: 'active',
      reason: 'multiple_verified_nearby',
    });
  });

  it('returns watch (not active) when confirmed incidents are in watch range but not active range', () => {
    const incidents = Array.from({ length: ACTIVE_THRESHOLD }, () =>
      makeIncident(ACTIVE_RADIUS_KM + 0.5, 10, 1),
    );
    expect(calculateStatus(incidents, 32.0, 34.8, NOW)).toEqual({
      state: 'watch',
      reason: 'incident_nearby',
    });
  });
});
