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
