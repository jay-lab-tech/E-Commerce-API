import { app } from './app.js';
import { prisma } from './config/database.js';
import { env } from './config/env.js';
import { redis } from './config/redis.js';
import { logger } from './utils/logger.js';

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    await redis.connect();
    await redis.ping();
    app.listen(env.PORT, () => {
      logger.info('server_started', { port: env.PORT });
    });
  } catch (error) {
    logger.error('server_start_failed', {
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
    });
    redis.disconnect();
    await prisma.$disconnect().catch(() => undefined);
    process.exitCode = 1;
  }
}

void startServer();
