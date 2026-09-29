import { app } from './app.js';
import { prisma } from './config/database.js';
import { env } from './config/env.js';
import { redis } from './config/redis.js';

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    await redis.connect();
    await redis.ping();
    app.listen(env.PORT, () => {
      console.log(`E-Commerce API listening on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('E-Commerce API failed to start because a dependency is unavailable.');
    console.error(error);
    redis.disconnect();
    await prisma.$disconnect().catch(() => undefined);
    process.exitCode = 1;
  }
}

void startServer();
