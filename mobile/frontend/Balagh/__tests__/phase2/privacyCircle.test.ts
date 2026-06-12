import {
  metersToPixelsAtZoom,
  privacyCircleRadius,
} from '../../src/presentation/map/privacyCircle';
import { INCIDENT_PRIVACY_RADIUS_M } from '../../src/core/config';

describe('privacy circle radius', () => {
  it('the privacy radius is ~150 m', () => {
    expect(INCIDENT_PRIVACY_RADIUS_M).toBe(150);
  });

  it('pixel radius doubles with each zoom level (Web Mercator scaling)', () => {
    const z14 = metersToPixelsAtZoom(150, 14);
    const z15 = metersToPixelsAtZoom(150, 15);
    expect(z15 / z14).toBeCloseTo(2, 6);
  });

  it('150 m is a clearly visible area at street zoom (z16)', () => {
    const px = metersToPixelsAtZoom(150, 16);
    expect(px).toBeGreaterThan(120);
    expect(px).toBeLessThan(180);
  });

  it('expression interpolates exponentially on zoom between the meter-true stops', () => {
    const expr = privacyCircleRadius();
    expect(expr[0]).toBe('interpolate');
    expect(expr[1]).toEqual(['exponential', 2]);
    expect(expr[2]).toEqual(['zoom']);
    expect(expr[3]).toBe(8);
    expect(expr[4]).toBeCloseTo(metersToPixelsAtZoom(150, 8), 6);
    expect(expr[5]).toBe(20);
    expect(expr[6]).toBeCloseTo(metersToPixelsAtZoom(150, 20), 6);
  });
});
