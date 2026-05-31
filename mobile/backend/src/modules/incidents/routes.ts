import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { broadcastGeo, broadcastToDevice } from '../../lib/events';
import { computeStatusAt } from '../status/service';
import * as service from './service';

// ── Validation schemas ───────────────────────────────────────────────────────

const incidentsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(10),
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

  // POST /incidents  — tighter limit: report submission
  app.post('/incidents', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
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

    // Broadcast new incident to subscribers within range (skip on idempotent replay)
    if (result.incident) {
      broadcastGeo(
        { t: 'incident.created', incident: result.incident },
        result.incident.lat,
        result.incident.lng,
      );
      for (const { deviceId: targetId, notification } of result.fanOut) {
        broadcastToDevice({ t: 'notification.new', notification }, targetId);
      }
    }

    return reply.status(201).send({ id: result.id, ref: result.ref });
  });

  // POST /incidents/:id/vote
  app.post<{ Params: { id: string } }>('/incidents/:id/vote', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async request => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    const body = parseBody(voteBodySchema, request.body);
    const result = await service.vote(deviceId, request.params.id, body.vote);
    const { incident } = result;

    // Broadcast updated vote counts to geo subscribers
    broadcastGeo(
      { t: 'vote.updated', id: incident.id, confirmations: incident.confirmations, denials: incident.denials },
      incident.lat,
      incident.lng,
    );

    // Recompute and broadcast area status after vote
    const status = await computeStatusAt(incident.lat, incident.lng);
    broadcastGeo(
      { t: 'status.changed', state: status.state, reason: status.reason },
      incident.lat,
      incident.lng,
    );

    // Notify the original reporter when confirmations cross the active threshold
    if (result.verificationNotif) {
      broadcastToDevice(
        { t: 'notification.new', notification: result.verificationNotif.notification },
        result.verificationNotif.deviceId,
      );
    }

    return incident;
  });

  // GET /incidents/:id/comments
  app.get<{ Params: { id: string } }>('/incidents/:id/comments', async request => {
    return service.getComments(request.params.id);
  });

  // POST /incidents/:id/comments
  app.post<{ Params: { id: string } }>('/incidents/:id/comments', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const deviceId = requireDeviceId(request.headers as Record<string, string | undefined>);
    const body = parseBody(commentBodySchema, request.body);
    const comment = await service.addComment(deviceId, request.params.id, body.body);
    return reply.status(201).send(comment);
  });
};

export default incidentsRoutes;
