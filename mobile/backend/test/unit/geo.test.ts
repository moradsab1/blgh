import { describe, it, expect } from 'vitest';
import { haversineKm } from '../../src/lib/geo';

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm(32.51, 35.15, 32.51, 35.15)).toBe(0);
  });

  it('calculates roughly 1 km for ~0.009 degree shift in latitude', () => {
    // 1 degree latitude ≈ 111 km, so 0.009° ≈ 1 km
    const dist = haversineKm(32.0, 35.0, 32.009, 35.0);
    expect(dist).toBeCloseTo(1.0, 0);
  });

  it('returns a positive value for distinct coordinates', () => {
    // Umm al-Fahm to Nazareth (~21 km)
    const dist = haversineKm(32.5139, 35.1566, 32.6996, 35.3034);
    expect(dist).toBeGreaterThan(15);
    expect(dist).toBeLessThan(30);
  });

  it('is symmetric', () => {
    const a = haversineKm(32.5, 35.1, 32.7, 35.3);
    const b = haversineKm(32.7, 35.3, 32.5, 35.1);
    expect(a).toBeCloseTo(b, 10);
  });
});
