import express from 'express';
import helmet from 'helmet';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { categoryRouter } from './modules/category/category.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '25kb' }));
app.use('/api/categories', categoryRouter);

app.get('/health', async (_request, response) => {
  const [databaseCheck, redisCheck] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);
  const postgres = databaseCheck.status === 'fulfilled';
  const redisHealthy = redisCheck.status === 'fulfilled' && redisCheck.value === 'PONG';
  const healthy = postgres && redisHealthy;

  response.status(healthy ? 200 : 503).json({
    data: {
      service: 'ecommerce-api',
      status: healthy ? 'ok' : 'degraded',
      dependencies: {
        postgres: postgres ? 'ok' : 'unavailable',
        redis: redisHealthy ? 'ok' : 'unavailable',
      },
    },
  });
});

app.use((_request, response) => {
  response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route tidak ditemukan' } });
});
app.use(errorHandler);
