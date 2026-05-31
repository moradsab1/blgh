import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError, notFound } from '../../lib/errors';
import { pool } from '../../db/client';

function requireDeviceId(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['x-device-id'];
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || id.trim() === '') {
    throw new AppError('VALIDATION_ERROR', 'X-Device-Id header is required', 400);
  }
  return id.trim();
}

const followUpBodySchema = z.object({
  vehicle: z.enum(['yes', 'no']).optional(),
  assailants: z.enum(['1', '2', '3+']).optional(),
  direction: z.enum(['north', 'south', 'east', 'west']).optional(),
  weapon: z.enum(['yes', 'no']).optional(),
});

const followUpsRoutes: FastifyPluginAsync = async app => {
  // POST /follow-up/:ref
  app.post<{ Params: { ref: string } }>('/follow-up/:ref', async (request, reply) => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    const parsed = followUpBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join('; ');
      throw new AppError('VALIDATION_ERROR', msg, 400);
    }

    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM incidents WHERE ref = $1 AND NOT hidden',
      [request.params.ref],
    );
    if (rows.length === 0) throw notFound('Incident not found');

    await pool.query(
      `INSERT INTO follow_ups (incident_ref, device_id, vehicle, assailants, direction, weapon)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        request.params.ref,
        deviceId,
        parsed.data.vehicle ?? null,
        parsed.data.assailants ?? null,
        parsed.data.direction ?? null,
        parsed.data.weapon ?? null,
      ],
    );

    return reply.status(201).send({ ok: true });
  });
};

export default followUpsRoutes;
