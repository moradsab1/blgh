import { EventEmitter } from 'node:events';
import type { WebSocket } from '@fastify/websocket';
import type { WsEvent } from './contracts';

export const bus = new EventEmitter();
bus.setMaxListeners(0);

// All authenticated operator WS connections in this process
export const operatorSockets = new Set<WebSocket>();

export function broadcastOperators(event: WsEvent): void {
  const json = JSON.stringify(event);
  for (const socket of operatorSockets) {
    if (socket.readyState === socket.OPEN) {
      try {
        socket.send(json);
      } catch {
        operatorSockets.delete(socket);
      }
    }
  }
}
