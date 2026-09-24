/**
 * Combined entry point: runs the API server + BullMQ worker in one process.
 * Used for free-tier deployment on Render (single Web Service).
 * This avoids needing a separate Background Worker (paid tier).
 */
import http from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './db/prisma';
import { redis } from './config/redis';
import { SearchService } from './services/search.service';
import { reconcilePendingEmails } from './queues/reconciliation';
import { createEmailWorker } from './queues/email.worker';

const server = http.createServer(app);
const PORT = env.PORT || 5000;
const baseUrl = process.env.RENDER_EXTERNAL_URL || env.BACKEND_URL || `http://localhost:${PORT}`;

async function start() {
  // ── 1. Start BullMQ Worker ──────────────────────────────────────────────
  logger.info('⚙️  Initializing BullMQ Email Worker...');
  logger.info(`Concurrency: ${env.WORKER_CONCURRENCY}, Throttle: ${env.DEFAULT_MIN_DELAY_BETWEEN_EMAILS_MS}ms`);

  try {
    await SearchService.ensureIndex();
    await reconcilePendingEmails();

    const worker = createEmailWorker();
    logger.info('✅ BullMQ Worker is now actively consuming jobs');

    // ── 2. Start HTTP API Server ─────────────────────────────────────────
    server.listen(PORT, () => {
      logger.info(`🚀 ReachInbox API Server running on port ${PORT} [${env.NODE_ENV}]`);
      logger.info(`📊 Bull Board Dashboard available at ${baseUrl}/admin/queues`);
    });

    // ── 3. Graceful Shutdown ─────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);

      server.close(async () => {
        try {
          await worker.close();
          logger.info('BullMQ worker closed.');
          await prisma.$disconnect();
          logger.info('Database disconnected.');
          await redis.quit();
          logger.info('Redis disconnected.');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during shutdown');
          process.exit(1);
        }
      });

      setTimeout(() => process.exit(1), 15000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      const msg = String(reason?.message || reason || '');
      if (msg.includes('administrator command') || reason?.code === 'E57P01') {
        logger.warn('Neon DB idle connection closed. Will reconnect on next query.');
        return;
      }
      logger.error({ reason }, 'Unhandled Rejection');
    });

    process.on('uncaughtException', (error: any) => {
      const msg = String(error?.message || error || '');
      if (msg.includes('administrator command') || error?.code === 'E57P01') {
        logger.warn('Neon DB idle connection closed. Will reconnect on next query.');
        return;
      }
      logger.error({ error }, 'Uncaught Exception');
    });

  } catch (error) {
    logger.error({ error }, 'Fatal error starting combined server');
    process.exit(1);
  }
}

start();
