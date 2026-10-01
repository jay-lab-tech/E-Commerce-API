import type { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (response.headersSent) return;
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({ error: { code: 'INVALID_JSON', message: 'Body harus berupa JSON yang valid' } });
    return;
  }
  logger.error('unhandled_request_error', {
    requestId: _request.header('x-request-id'),
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
  });
  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan pada server' },
  });
};
