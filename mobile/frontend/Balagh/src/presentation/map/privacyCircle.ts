/**
 * Privacy-circle radius — incidents render as an area, never as an exact point.
 *
 * Every open incident is drawn as a translucent circle covering roughly
 * INCIDENT_PRIVACY_RADIUS_M of ground (~150 m) around the reported location,
 * so the exact spot stays hidden from viewers.
 *
 * Mapbox `circleRadius` is in screen pixels, so a fixed value would cover a
 * different ground distance at every zoom level. This expression converts the
 * ground radius (meters) to pixels per zoom using the Web Mercator scale
 * (equatorial circumference over 512 px tiles) evaluated at the app's service
 * area latitude (~32.5°N). Exponential base-2 interpolation between the stops
 * matches the 2^zoom tile scaling exactly, so the circle stays glued to the
 * same ground area while zooming.
 */

import { INCIDENT_PRIVACY_RADIUS_M } from '../../core/config';

const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const TILE_SIZE = 512;
const SERVICE_AREA_LAT_DEG = 32.5;

export function metersToPixelsAtZoom(meters: number, zoom: number): number {
  const metersPerPixel =
    (EARTH_CIRCUMFERENCE_M * Math.cos((SERVICE_AREA_LAT_DEG * Math.PI) / 180)) /
    (TILE_SIZE * 2 ** zoom);
  return meters / metersPerPixel;
}

/** Mapbox style expression: pixel radius that covers `meters` of ground at any zoom. */
export const privacyCircleRadius = (
  meters: number = INCIDENT_PRIVACY_RADIUS_M,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => [
  'interpolate',
  ['exponential', 2],
  ['zoom'],
  8,
  metersToPixelsAtZoom(meters, 8),
  20,
  metersToPixelsAtZoom(meters, 20),
];
