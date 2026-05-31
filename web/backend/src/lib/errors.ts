// Mirror of mobile/backend/src/lib/errors.ts — keep in sync.
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (message = 'Not found'): AppError =>
  new AppError('NOT_FOUND', message, 404);

export const badRequest = (message = 'Bad request'): AppError =>
  new AppError('VALIDATION_ERROR', message, 400);

export const conflict = (code: string, message: string): AppError =>
  new AppError(code, message, 409);

export const unauthorized = (): AppError =>
  new AppError('UNAUTHORIZED', 'Unauthorized', 401);

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AppError) {
    void reply
      .status(error.statusCode)
      .send({ code: error.code, message: error.message });
    return;
  }

  if (error.statusCode === 400) {
    void reply.status(400).send({ code: 'VALIDATION_ERROR', message: error.message });
    return;
  }

  if (error.statusCode === 429) {
    void reply.status(429).send({ code: 'RATE_LIMITED', message: 'Too many requests' });
    return;
  }

  reply.log.error(error);
  void reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}
