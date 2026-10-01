import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

export const requestLogger: RequestHandler = (request, response, next) => {
  const requestId = request.header('x-request-id') ?? randomUUID();
  const startedAt = performance.now();
  response.setHeader('X-Request-Id', requestId);

  response.on('finish', () => {
    if (request.path === '/health') return;
    logger.info('http_request', {
      requestId,
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
      ip: request.ip,
    });
  });
  next();
};
