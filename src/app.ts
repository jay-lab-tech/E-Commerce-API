import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { categoryRouter } from './modules/category/category.routes.js';
import { productRouter } from './modules/product/product.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { orderRouter } from './modules/order/order.routes.js';
import { adminOrderRouter } from './modules/order/admin-order.routes.js';
import { redisRateLimit } from './middlewares/rateLimit.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { env } from './config/env.js';
import { corsMiddleware } from './middlewares/cors.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '25kb' }));
app.use(requestLogger);
app.use('/api', redisRateLimit({ name: 'api', max: 120, windowSeconds: 60 }));
app.use('/api/categories', categoryRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/admin/orders', adminOrderRouter);
app.get(['/docs', '/docs/'], (_request, response) => {
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' https://unpkg.com 'unsafe-inline'; img-src 'self' data: https:; object-src 'none'; base-uri 'self'");
  response.sendFile(path.resolve('docs/index.html'));
});
app.use('/docs', express.static('docs'));

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
