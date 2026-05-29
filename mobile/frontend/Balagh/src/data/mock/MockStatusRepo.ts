import type { IStatusRepository } from '../repositories/interfaces';
import type { StatusResponse } from '../../core/types';
import { db } from './db';
import {
  ACTIVE_RADIUS_KM,
  ACTIVE_THRESHOLD,
  ACTIVE_WINDOW_MIN,
  WATCH_RADIUS_KM,
  WATCH_WINDOW_MIN,
} from '../../core/config';

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const haversineKm = (
  lat1: number, lng1: number, lat2: number, lng2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export class MockStatusRepo implements IStatusRepository {
  async getStatus(lat: number, lng: number): Promise<StatusResponse> {
    await sleep(200);
    const now = Date.now();
    const incidents = db.incidents.getAll().filter(i => !i.resolvedAt);

    const activeWindow = ACTIVE_WINDOW_MIN * 60 * 1000;
    const watchWindow = WATCH_WINDOW_MIN * 60 * 1000;

    const nearActive = incidents.filter(
      i =>
        haversineKm(lat, lng, i.lat, i.lng) <= ACTIVE_RADIUS_KM &&
        now - new Date(i.createdAt).getTime() <= activeWindow &&
        i.confirmations >= 1,
    );

    if (nearActive.length >= ACTIVE_THRESHOLD) {
      return { state: 'active', reason: 'multiple_verified_nearby' };
    }

    const nearWatch = incidents.filter(
      i =>
        haversineKm(lat, lng, i.lat, i.lng) <= WATCH_RADIUS_KM &&
        now - new Date(i.createdAt).getTime() <= watchWindow,
    );

    if (nearWatch.length >= 1) {
      return { state: 'watch', reason: 'incident_nearby' };
    }

    return { state: 'calm', reason: 'no_nearby_incidents' };
  }
}
