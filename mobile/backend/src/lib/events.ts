import { EventEmitter } from 'node:events';
import type { WebSocket } from '@fastify/websocket';
import { haversineKm } from './geo';
import type { WsEvent } from './contracts';

export interface Subscription {
  socket: WebSocket;
  deviceId: string;
  lat: number;
  lng: number;
  radiusKm: number;
  subscribed: boolean;   // false until client sends { type: 'subscribe', ... }
}

export const bus = new EventEmitter();
bus.setMaxListeners(0);   // one listener per connected socket is fine

// Key = deviceId — latest connection from a device replaces the previous one
export const subscriptions = new Map<string, Subscription>();

export function broadcast(event: WsEvent, filter: (sub: Subscription) => boolean): void {
  const json = JSON.stringify(event);
  for (const sub of subscriptions.values()) {
    if (filter(sub) && sub.socket.readyState === sub.socket.OPEN) {
      try {
        sub.socket.send(json);
      } catch {
        subscriptions.delete(sub.deviceId);
      }
    }
  }
}

export function broadcastGeo(event: WsEvent, lat: number, lng: number): void {
  broadcast(
    event,
    sub =>
      sub.subscribed &&
      haversineKm(sub.lat, sub.lng, lat, lng) <= sub.radiusKm,
  );
}

export function broadcastToDevice(event: WsEvent, deviceId: string): void {
  broadcast(event, sub => sub.deviceId === deviceId);
}

export function broadcastAll(event: WsEvent): void {
  broadcast(event, () => true);
}
