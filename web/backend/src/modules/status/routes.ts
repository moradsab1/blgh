import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getStatus } from './service';
import { badRequest } from '../../lib/errors';

const statusQuerySchema = z.object({
  lat: z.coerce.number({ required_error: 'lat is required' }),
  lng: z.coerce.number({ required_error: 'lng is required' }),
});

const statusRoutes: FastifyPluginAsync = async app => {
  app.get<{ Querystring: Record<string, string> }>('/status', async (request, reply) => {
    const parsed = statusQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues.map(i => i.message).join('; '));
    }
    const { lat, lng } = parsed.data;
    const status = await getStatus(lat, lng);
    return reply.send(status);
  });
};

export default statusRoutes;
