import type { FastifyPluginAsync } from 'fastify';
import { config } from '../../config';
import { unauthorized } from '../../lib/errors';
import { broadcastGeo } from '../../lib/events';
import { resolveIncident, hideIncident, getIncidentById } from '../incidents/service';

function requireAdminToken(headers: Record<string, string | string[] | undefined>): void {
  const raw = headers['authorization'];
  const header = Array.isArray(raw) ? raw[0] : raw ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== config.ADMIN_TOKEN) throw unauthorized();
}

const adminRoutes: FastifyPluginAsync = async app => {
  // POST /admin/incidents/:id/resolve
  app.post<{ Params: { id: string } }>('/admin/incidents/:id/resolve', async (request, reply) => {
    requireAdminToken(request.headers as Record<string, string | undefined>);
    await resolveIncident(request.params.id);

    const row = await getIncidentById(request.params.id);
    if (row) {
      broadcastGeo(
        { t: 'incident.resolved', id: request.params.id },
        row.lat,
        row.lng,
      );
    }

    return reply.status(204).send();
  });

  // POST /admin/incidents/:id/hide
  app.post<{ Params: { id: string } }>('/admin/incidents/:id/hide', async (request, reply) => {
    requireAdminToken(request.headers as Record<string, string | undefined>);
    await hideIncident(request.params.id);
    return reply.status(204).send();
  });
};

export default adminRoutes;
