import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { config } from './config';
import { errorHandler } from './lib/errors';
import { operatorAuthHook } from './lib/auth';
import { pool } from './db/client';
import localitiesRoutes from './modules/localities/routes';

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

  await app.register(cors, {
    origin: config.DASHBOARD_ORIGIN,
    credentials: true,
  });
  await app.register(websocket);
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, ctx) => ({
      code: 'RATE_LIMITED',
      message: `Rate limit exceeded, retry in ${Math.ceil(ctx.ttl / 1000)}s`,
    }),
  });

  // Global operator-auth gate — every route except /health and /ws
  app.addHook('onRequest', operatorAuthHook);

  app.setErrorHandler(errorHandler);

  app.get('/health', async () => {
    await pool.query('SELECT 1');
    return { ok: true, db: 'ok' };
  });

  await app.register(localitiesRoutes);

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
