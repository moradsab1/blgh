import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import * as service from './service';

function requireDeviceId(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['x-device-id'];
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || id.trim() === '') {
    throw new AppError('VALIDATION_ERROR', 'X-Device-Id header is required', 400);
  }
  return id.trim();
}

const markReadBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

const notificationsRoutes: FastifyPluginAsync = async app => {
  // GET /notifications
  app.get('/notifications', async request => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    return service.getNotifications(deviceId);
  });

  // POST /notifications/read
  app.post('/notifications/read', async (request, reply) => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    const parsed = markReadBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join('; ');
      throw new AppError('VALIDATION_ERROR', msg, 400);
    }
    await service.markRead(deviceId, parsed.data.ids);
    return reply.status(204).send();
  });

  // POST /notifications/read-all
  app.post('/notifications/read-all', async (request, reply) => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    await service.markAllRead(deviceId);
    return reply.status(204).send();
  });
};

export default notificationsRoutes;
