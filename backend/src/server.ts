import http from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './db/prisma';
import { redis } from './config/redis';

const server = http.createServer(app);

const PORT = env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 ReachInbox API Server running on port ${PORT} [${env.NODE_ENV}]`);
  logger.info(`📊 Bull Board Dashboard available at http://localhost:${PORT}/admin/queues`);
});

// Graceful Shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down API server gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database disconnected.');
      await redis.quit();
      logger.info('Redis client disconnected.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  // Force close after 10s timeout
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: any) => {
  const msg = String(reason?.message || reason || '');
  if (msg.includes('administrator command') || reason?.code === 'E57P01') {
    logger.warn('Neon DB idle connection closed by host. Prisma will automatically reconnect on next query.');
    return;
  }
  logger.error({ reason }, 'Unhandled Rejection in API server');
});

process.on('uncaughtException', (error: any) => {
  const msg = String(error?.message || error || '');
  if (msg.includes('administrator command') || error?.code === 'E57P01') {
    logger.warn('Neon DB idle connection closed by host. Prisma will automatically reconnect on next query.');
    return;
  }
  logger.error({ error }, 'Uncaught Exception in API server');
});
