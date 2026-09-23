import { logger } from './config/logger';
import { prisma } from './db/prisma';
import { redis } from './config/redis';
import { SearchService } from './services/search.service';
import { reconcilePendingEmails } from './queues/reconciliation';
import { createEmailWorker } from './queues/email.worker';
import { env } from './config/env';

async function startWorkerProcess() {
  logger.info('⚙️ Starting ReachInbox Worker Process...');
  logger.info(`Concurrency: ${env.WORKER_CONCURRENCY}, Throttling default: ${env.DEFAULT_MIN_DELAY_BETWEEN_EMAILS_MS}ms`);

  try {
    // 1. Initialize Elasticsearch index if needed
    logger.info('Ensuring Elasticsearch indices are created...');
    await SearchService.ensureIndex();

    // 2. Run Boot-Time Reconciliation for Restart Survival
    logger.info('Running boot-time pending email reconciliation...');
    await reconcilePendingEmails();

    // 3. Start BullMQ Worker
    const worker = createEmailWorker();
    logger.info('🚀 ReachInbox BullMQ Email Worker is now actively consuming jobs');

    // 4. Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down worker gracefully...`);
      try {
        await worker.close();
        logger.info('BullMQ worker closed (all in-flight jobs completed).');
        await prisma.$disconnect();
        logger.info('Database disconnected.');
        await redis.quit();
        logger.info('Redis disconnected.');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during worker shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      const msg = String(reason?.message || reason || '');
      if (msg.includes('administrator command') || reason?.code === 'E57P01') {
        logger.warn('Neon DB idle connection closed by host. Prisma will automatically reconnect on next query.');
        return;
      }
      logger.error({ reason }, 'Unhandled Rejection in worker process');
    });

    process.on('uncaughtException', (error: any) => {
      const msg = String(error?.message || error || '');
      if (msg.includes('administrator command') || error?.code === 'E57P01') {
        logger.warn('Neon DB idle connection closed by host. Prisma will automatically reconnect on next query.');
        return;
      }
      logger.error({ error }, 'Uncaught Exception in worker process');
    });
  } catch (error) {
    logger.error({ error }, 'Fatal error starting worker process');
    process.exit(1);
  }
}

startWorkerProcess();
