import { describe, it, expect } from 'vitest';
import { haversineKm } from '../../src/lib/geo';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(32.0, 34.8, 32.0, 34.8)).toBe(0);
  });

  it('calculates distance between Tel Aviv and Jerusalem (~60 km)', () => {
    const d = haversineKm(32.0853, 34.7818, 31.7683, 35.2137);
    expect(d).toBeGreaterThan(55);
    expect(d).toBeLessThan(65);
  });

  it('returns a positive value for any two distinct points', () => {
    expect(haversineKm(0, 0, 1, 1)).toBeGreaterThan(0);
  });
});
