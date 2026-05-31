import type { FastifyPluginAsync } from 'fastify';
import type { WebsocketHandler } from '@fastify/websocket';
import { z } from 'zod';
import { config } from '../config';
import { operatorSockets } from '../lib/events';

const authSchema = z.object({
  type: z.literal('auth'),
  token: z.string(),
});

const PING_MS = 30_000;
const TIMEOUT_MS = 90_000;

const wsRoutes: FastifyPluginAsync = async app => {
  // /ws is excluded from the global operatorAuthHook — auth happens here
  // via a {type:"auth",token} frame so the token never appears in the URL.
  app.get(
    '/ws',
    { websocket: true },
    (function (socket) {
      let authenticated = false;
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
          if (typeof msg !== 'object' || msg === null) return;

          const msgType = (msg as { type?: unknown }).type;

          if (!authenticated) {
            if (msgType === 'auth') {
              const parsed = authSchema.safeParse(msg);
              if (parsed.success && parsed.data.token === config.OPERATOR_TOKEN) {
                authenticated = true;
                operatorSockets.add(socket);
                socket.send(JSON.stringify({ type: 'auth_ok' }));
              } else {
                socket.close(4001, 'Unauthorized');
              }
            }
            return;
          }

          // type:'pong' and {type:'subscribe'} just reset the timeout (above)
        } catch {
          /* ignore malformed frames */
        }
      });

      const cleanup = (): void => {
        operatorSockets.delete(socket);
        if (pingTimer) clearInterval(pingTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
      };

      socket.on('close', cleanup);
      socket.on('error', cleanup);
    }) as WebsocketHandler,
  );
};

export default wsRoutes;
