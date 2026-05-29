import type { WsEvent } from '../../core/types';
import { db } from './db';

type EventHandler = (event: WsEvent) => void;

const handlers: Set<EventHandler> = new Set();

export const wsEventEmitter = {
  subscribe: (handler: EventHandler): (() => void) => {
    handlers.add(handler);
    return () => handlers.delete(handler);
  },
  emit: (event: WsEvent): void => {
    // Snapshot first so a handler that (un)subscribes during dispatch is safe,
    // and isolate failures so one throwing handler can't drop the rest.
    [...handlers].forEach(h => {
      try {
        h(event);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[wsEventEmitter] handler threw:', e);
      }
    });
  },
};

// Periodic mock emitter — fires new incidents and status changes to exercise live UI
let emitterTimer: ReturnType<typeof setInterval> | null = null;

const MOCK_CATEGORIES = ['SUSPICIOUS', 'ASSAULT', 'ROBBERY'] as const;
const MOCK_COORDS = [
  { lat: 32.5145, lng: 35.1570 },
  { lat: 32.5130, lng: 35.1550 },
  { lat: 32.5160, lng: 35.1590 },
];
let mockIdCounter = 1000;

export const startMockEmitter = (): void => {
  if (emitterTimer) return;

  emitterTimer = setInterval(() => {
    const roll = Math.random();
    if (roll < 0.4) {
      const category = MOCK_CATEGORIES[Math.floor(Math.random() * MOCK_CATEGORIES.length)];
      const coords = MOCK_COORDS[Math.floor(Math.random() * MOCK_COORDS.length)];
      const incident = {
        id: String(++mockIdCounter),
        ref: `BLG-M${mockIdCounter.toString(36).toUpperCase()}`,
        category,
        severity: category === 'ASSAULT' ? ('high' as const) : ('medium' as const),
        lat: coords.lat,
        lng: coords.lng,
        localityId: 'umm-al-fahm',
        createdAt: new Date().toISOString(),
        confirmations: 0,
        denials: 0,
        commentCount: 0,
        myVote: null,
      };
      db.incidents.add(incident);
      wsEventEmitter.emit({ t: 'incident.created', incident });
    } else if (roll < 0.55) {
      wsEventEmitter.emit({ t: 'status.changed', state: 'watch', reason: 'incident_nearby' });
    }
  }, 15000);
};

export const stopMockEmitter = (): void => {
  if (emitterTimer) {
    clearInterval(emitterTimer);
    emitterTimer = null;
  }
};
