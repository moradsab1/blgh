import type { Incident, Locality, Comment, StatusResponse } from '../lib/contracts';
import { mockLocalities, mockIncidents, mockComments } from './db';
import { calculateStatus } from './statusLogic';

// In-memory mutable state
let incidents = [...mockIncidents];

const delay = (ms = 200) => new Promise<void>((r) => setTimeout(r, ms));

export const mockApi = {
  async getHealth() {
    await delay(100);
    return { ok: true, db: 'ok' };
  },

  async getLocalities(q: string): Promise<Locality[]> {
    await delay(150);
    if (!q) return mockLocalities;
    const lower = q.toLowerCase();
    return mockLocalities.filter(
      (l) =>
        l.nameAr.includes(q) ||
        l.nameHe.includes(q) ||
        l.nameEn.toLowerCase().includes(lower),
    );
  },

  async getIncidents(_lat: number, _lng: number, _radiusKm: number): Promise<Incident[]> {
    await delay(200);
    return incidents.filter((i) => !i.resolvedAt);
  },

  async getArchivedIncidents(): Promise<Incident[]> {
    await delay(200);
    return incidents.filter((i) => !!i.resolvedAt);
  },

  async getIncident(id: string): Promise<Incident> {
    await delay(150);
    const inc = incidents.find((i) => i.id === id);
    if (!inc) throw new Error('NOT_FOUND');
    return inc;
  },

  async getComments(incidentId: string): Promise<Comment[]> {
    await delay(150);
    return mockComments.filter((c) => c.incidentId === incidentId);
  },

  async getStatus(lat: number, lng: number): Promise<StatusResponse> {
    await delay(100);
    return calculateStatus(incidents, lat, lng);
  },

  async resolveIncident(id: string): Promise<void> {
    await delay(300);
    incidents = incidents.map((i) =>
      i.id === id ? { ...i, resolvedAt: new Date().toISOString() } : i,
    );
  },

  async hideIncident(id: string): Promise<void> {
    await delay(300);
    incidents = incidents.filter((i) => i.id !== id);
  },
};
