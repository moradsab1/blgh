import type { IIncidentRepository } from '../repositories/interfaces';
import type { Incident } from '../../core/types';
import { db } from './db';
import { wsEventEmitter } from './eventEmitter';
import store, { StorageKeys } from '../../core/storage';

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const latency = (): number => 300 + Math.random() * 500;

const SEVERITY_MAP: Record<string, Incident['severity']> = {
  GUNFIRE: 'critical',
  STABBING: 'critical',
  ASSAULT: 'high',
  ROBBERY: 'high',
  SUSPICIOUS: 'medium',
  OTHER: 'medium',
};

let _refCounter = 100;

export class MockIncidentRepo implements IIncidentRepository {
  async getIncidents(_lat: number, _lng: number, _radiusKm: number): Promise<Incident[]> {
    await sleep(latency());
    if (Math.random() < 0.05) throw new Error('NETWORK_ERROR');
    // Only currently open incidents — the backend closes pins after 24 h.
    return db.incidents.getOpen();
  }

  async getIncidentHistory(rangeHours: number, localityId?: string): Promise<Incident[]> {
    await sleep(latency());
    const now = Date.now();
    return db.incidents
      .getAll()
      .filter(i => now - new Date(i.createdAt).getTime() <= rangeHours * 3_600_000)
      .filter(i => (localityId ? i.localityId === localityId : true));
  }

  async getIncident(id: string): Promise<Incident> {
    await sleep(latency());
    const incident = db.incidents.getById(id);
    if (!incident) throw new Error('NOT_FOUND');
    return incident;
  }

  async submitReport(
    category: string,
    lat: number,
    lng: number,
    description?: string,
    locationText?: string,
  ): Promise<{ id: string; ref: string }> {
    await sleep(latency());
    const id = String(Date.now());
    const ref = `BLG-${(++_refCounter).toString(36).toUpperCase().padStart(6, '0')}`;
    const localityId = store.getString(StorageKeys.LOCALITY_ID) ?? 'umm-al-fahm';
    const incident: Incident = {
      id,
      ref,
      category: category as Incident['category'],
      severity: SEVERITY_MAP[category] ?? 'medium',
      description,
      locationText: locationText?.trim() || undefined,
      lat,
      lng,
      localityId,
      createdAt: new Date().toISOString(),
    };
    db.incidents.add(incident);
    wsEventEmitter.emit({ t: 'incident.created', incident });
    return { id, ref };
  }
}
