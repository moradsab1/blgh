import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { getStatus } from './service';

const statusQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

function requireDeviceId(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['x-device-id'];
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || id.trim() === '') {
    throw new AppError('VALIDATION_ERROR', 'X-Device-Id header is required', 400);
  }
  return id.trim();
}

const statusRoutes: FastifyPluginAsync = async app => {
  app.get('/status', async request => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    const result = statusQuerySchema.safeParse(request.query);
    if (!result.success) {
      const msg = result.error.issues.map(i => i.message).join('; ');
      throw new AppError('VALIDATION_ERROR', msg, 400);
    }
    return getStatus(deviceId, result.data.lat, result.data.lng);
  });
};

export default statusRoutes;
