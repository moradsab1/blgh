import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { config } from './config';
import { errorHandler } from './lib/errors';
import { pool } from './db/client';
import localitiesRoutes from './modules/localities/routes';
import incidentsRoutes from './modules/incidents/routes';
import statusRoutes from './modules/status/routes';
import wsRoutes from './realtime/ws';
import adminRoutes from './modules/admin/routes';
import notificationsRoutes from './modules/notifications/routes';
import followUpsRoutes from './modules/followups/routes';

function semverLt(a: string, b: string): boolean {
  const parse = (v: string): number[] => v.split('.').map(Number);
  const [aMaj = 0, aMin = 0, aPatch = 0] = parse(a);
  const [bMaj = 0, bMin = 0, bPatch = 0] = parse(b);
  if (aMaj !== bMaj) return aMaj < bMaj;
  if (aMin !== bMin) return aMin < bMin;
  return aPatch < bPatch;
}

async function build() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(websocket);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, ctx) => ({
      code: 'RATE_LIMITED',
      message: `Rate limit exceeded, retry in ${Math.ceil(ctx.ttl / 1000)}s`,
    }),
  });

  // 426 Update Gate — reject outdated clients that send X-App-Version
  app.addHook('onRequest', (request, reply, done) => {
    const raw = request.headers['x-app-version'];
    const version = Array.isArray(raw) ? raw[0] : raw;
    if (version && semverLt(version, config.MIN_APP_VERSION)) {
      void reply.status(426).send({ code: 'UPDATE_REQUIRED', message: 'Please update the app' });
    } else {
      done();
    }
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => {
    await pool.query('SELECT 1');
    return { ok: true, db: 'ok' };
  });

  // Routes
  await app.register(localitiesRoutes);
  await app.register(incidentsRoutes);
  await app.register(statusRoutes);
  await app.register(wsRoutes);
  await app.register(adminRoutes);
  await app.register(notificationsRoutes);
  await app.register(followUpsRoutes);

  return app;
}

async function main(): Promise<void> {
  const app = await build();

  const shutdown = async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
