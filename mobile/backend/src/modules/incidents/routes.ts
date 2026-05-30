import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import * as service from './service';

// ── Validation schemas ───────────────────────────────────────────────────────

const incidentsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(10),
});

const statusQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const submitBodySchema = z.object({
  category: z.enum(['GUNFIRE', 'STABBING', 'ASSAULT', 'ROBBERY', 'SUSPICIOUS', 'OTHER']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  description: z.string().max(280).optional(),
  idempotencyKey: z.string().optional(),
});

const voteBodySchema = z.object({
  vote: z.enum(['confirm', 'deny']),
});

const commentBodySchema = z.object({
  body: z.string().min(1).max(280),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireDeviceId(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['x-device-id'];
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || id.trim() === '') {
    throw new AppError('VALIDATION_ERROR', 'X-Device-Id header is required', 400);
  }
  return id.trim();
}

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues.map(i => i.message).join('; ');
    throw new AppError('VALIDATION_ERROR', msg, 400);
  }
  return result.data;
}

function parseQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    const msg = result.error.issues.map(i => i.message).join('; ');
    throw new AppError('VALIDATION_ERROR', msg, 400);
  }
  return result.data;
}

// ── Routes ───────────────────────────────────────────────────────────────────

const incidentsRoutes: FastifyPluginAsync = async app => {
  // GET /incidents?lat=&lng=&radiusKm=
  app.get('/incidents', async request => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    const q = parseQuery(incidentsQuerySchema, request.query);
    return service.getIncidents(deviceId, q.lat, q.lng, q.radiusKm);
  });

  // GET /incidents/:id
  app.get<{ Params: { id: string } }>('/incidents/:id', async request => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    return service.getIncident(deviceId, request.params.id);
  });

  // POST /incidents
  app.post('/incidents', async (request, reply) => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    const body = parseBody(submitBodySchema, request.body);
    const result = await service.submitReport(
      deviceId,
      body.category,
      body.lat,
      body.lng,
      body.description,
      body.idempotencyKey,
    );
    // fanOut is stored for Phase 3 WS broadcast — ignored here
    return reply.status(201).send({ id: result.id, ref: result.ref });
  });

  // POST /incidents/:id/vote
  app.post<{ Params: { id: string } }>('/incidents/:id/vote', async request => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    const body = parseBody(voteBodySchema, request.body);
    return service.vote(deviceId, request.params.id, body.vote);
  });

  // GET /incidents/:id/comments
  app.get<{ Params: { id: string } }>('/incidents/:id/comments', async request => {
    return service.getComments(request.params.id);
  });

  // POST /incidents/:id/comments
  app.post<{ Params: { id: string } }>('/incidents/:id/comments', async (request, reply) => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    const body = parseBody(commentBodySchema, request.body);
    const comment = await service.addComment(deviceId, request.params.id, body.body);
    return reply.status(201).send(comment);
  });
};

export default incidentsRoutes;
