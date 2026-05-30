import type { FastifyPluginAsync } from 'fastify';
import type { WebsocketHandler } from '@fastify/websocket';
import { z } from 'zod';
import { subscriptions } from '../lib/events';
import { INCIDENT_RADIUS_KM } from '../lib/constants';

const subscribeSchema = z.object({
  type: z.literal('subscribe'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(0.1).max(20),
});

const PING_MS = 30_000;
const TIMEOUT_MS = 90_000;

const wsRoutes: FastifyPluginAsync = async app => {
  app.get<{ Querystring: { deviceId?: string } }>(
    '/ws',
    { websocket: true },
    (function (socket, request) {
      // Accept device ID from header (preferred) or query string (browser fallback)
      const query = request.query as { deviceId?: string };
      const raw =
        request.headers['x-device-id'] ?? query.deviceId ?? '';
      const deviceId = (Array.isArray(raw) ? raw[0] : raw).trim();

      if (!deviceId) {
        socket.close(4001, 'X-Device-Id header required');
        return;
      }

      subscriptions.set(deviceId, {
        socket,
        deviceId,
        lat: 0,
        lng: 0,
        radiusKm: INCIDENT_RADIUS_KM,
        subscribed: false,
      });

      let pingTimer: ReturnType<typeof setInterval> | null = null;
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

      const resetTimeout = (): void => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(() => {
          socket.close(4000, 'Keepalive timeout');
        }, TIMEOUT_MS);
      };

      pingTimer = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, PING_MS);

      resetTimeout();

      socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
        resetTimeout();
        try {
          const msg: unknown = JSON.parse(data.toString());
          if (
            typeof msg === 'object' &&
            msg !== null &&
            (msg as { type?: unknown }).type === 'subscribe'
          ) {
            const parsed = subscribeSchema.safeParse(msg);
            if (parsed.success) {
              subscriptions.set(deviceId, {
                socket,
                deviceId,
                lat: parsed.data.lat,
                lng: parsed.data.lng,
                radiusKm: parsed.data.radiusKm,
                subscribed: true,
              });
            }
          }
          // type:'pong' and unknown messages just reset the timeout (above)
        } catch {
          /* ignore malformed frames */
        }
      });

      const cleanup = (): void => {
        subscriptions.delete(deviceId);
        if (pingTimer) clearInterval(pingTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
      };

      socket.on('close', cleanup);
      socket.on('error', cleanup);
    }) as WebsocketHandler,
  );
};

export default wsRoutes;
