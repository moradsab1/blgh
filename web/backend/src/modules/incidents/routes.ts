import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  listIncidents,
  getIncident,
  getComments,
  resolveIncident,
  hideIncident,
  type StatusFilter,
} from './service';
import { broadcastOperators } from '../../lib/events';
import { badRequest } from '../../lib/errors';

const STATUS_VALUES = ['active', 'resolved', 'hidden', 'all'] as const;
const SEVERITY_VALUES = ['critical', 'high', 'medium', 'low'] as const;
const CATEGORY_VALUES = ['GUNFIRE', 'STABBING', 'ASSAULT', 'ROBBERY', 'SUSPICIOUS', 'OTHER'] as const;

const listQuerySchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  severity: z.string().optional(),
  category: z.string().optional(),
  localityId: z.string().optional(),
  bbox: z.string().optional(),
  since: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().optional(),
});

const incidentsRoutes: FastifyPluginAsync = async app => {
  // GET /incidents
  app.get<{ Querystring: Record<string, string> }>('/incidents', async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues.map(i => i.message).join('; '));
    }
    const q = parsed.data;

    const severity = q.severity
      ? q.severity.split(',').filter(s => (SEVERITY_VALUES as readonly string[]).includes(s))
      : undefined;
    const category = q.category
      ? q.category.split(',').filter(c => (CATEGORY_VALUES as readonly string[]).includes(c))
      : undefined;

    let bbox: [number, number, number, number] | undefined;
    if (q.bbox) {
      const parts = q.bbox.split(',').map(Number);
      if (parts.length !== 4 || parts.some(isNaN)) {
        throw badRequest('bbox must be minLng,minLat,maxLng,maxLat');
      }
      bbox = parts as [number, number, number, number];
    }

    const incidents = await listIncidents({
      status: q.status as StatusFilter | undefined,
      severity: severity && severity.length > 0 ? severity : undefined,
      category: category && category.length > 0 ? category : undefined,
      localityId: q.localityId,
      bbox,
      since: q.since,
      lat: q.lat,
      lng: q.lng,
      radiusKm: q.radiusKm,
    });

    return reply.send(incidents);
  });

  // GET /incidents/:id
  app.get<{ Params: { id: string } }>('/incidents/:id', async (request, reply) => {
    const incident = await getIncident(request.params.id);
    return reply.send(incident);
  });

  // GET /incidents/:id/comments
  app.get<{ Params: { id: string } }>('/incidents/:id/comments', async (request, reply) => {
    const comments = await getComments(request.params.id);
    return reply.send(comments);
  });

  // POST /incidents/:id/resolve
  app.post<{ Params: { id: string } }>('/incidents/:id/resolve', async (request, reply) => {
    await resolveIncident(request.params.id);
    broadcastOperators({ t: 'incident.resolved', id: request.params.id });
    return reply.status(204).send();
  });

  // POST /incidents/:id/hide
  app.post<{ Params: { id: string } }>('/incidents/:id/hide', async (request, reply) => {
    await hideIncident(request.params.id);
    broadcastOperators({ t: 'incident.hidden', id: request.params.id });
    return reply.status(204).send();
  });
};

export default incidentsRoutes;
