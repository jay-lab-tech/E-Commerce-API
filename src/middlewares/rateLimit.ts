import type { RequestHandler } from 'express';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

type RateLimitOptions = {
  name: string;
  max: number;
  windowSeconds: number;
};

export function redisRateLimit({ name, max, windowSeconds }: RateLimitOptions): RequestHandler {
  return async (request, response, next) => {
    const identity = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const key = `rate-limit:${name}:${identity}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      const ttl = Math.max(await redis.ttl(key), 1);
      response.setHeader('X-RateLimit-Limit', max);
      response.setHeader('X-RateLimit-Remaining', Math.max(max - count, 0));
      response.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

      if (count > max) {
        response.setHeader('Retry-After', ttl);
        response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Terlalu banyak request, coba lagi nanti' } });
        return;
      }
      next();
    } catch (error) {
      logger.warn('rate_limit_unavailable', { name, error: error instanceof Error ? error.message : String(error) });
      next();
    }
  };
}
