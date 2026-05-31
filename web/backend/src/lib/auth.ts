import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import { unauthorized } from './errors';

export function requireOperatorToken(
  headers: Record<string, string | string[] | undefined>,
): void {
  const raw = headers['authorization'];
  const header = Array.isArray(raw) ? raw[0] : (raw ?? '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== config.OPERATOR_TOKEN) throw unauthorized();
}

export async function operatorAuthHook(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // /health is the only ungated route; /ws auth is handled via the auth frame
  if (request.url === '/health' || request.url.startsWith('/ws')) return;
  requireOperatorToken(request.headers as Record<string, string | undefined>);
}
