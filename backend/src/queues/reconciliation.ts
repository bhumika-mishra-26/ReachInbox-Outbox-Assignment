import { prisma } from '../db/prisma';
import { redis } from '../config/redis';
import { emailQueue } from './email.queue';
import { logger } from '../config/logger';

export async function reconcilePendingEmails(): Promise<number> {
  const lockKey = 'reconcile:lock';
  const lockValue = `${Date.now()}-${Math.random()}`;

  // Acquire lock for 30s to prevent race condition across multiple worker replicas
  const acquired = await redis.set(lockKey, lockValue, 'EX', 30, 'NX');
  if (!acquired) {
    logger.info('Reconciliation: another worker instance is already reconciling. Skipping.');
    return 0;
  }

  try {
    logger.info('Reconciliation: Scanning database for pending SCHEDULED emails...');

    const pendingEmails = await prisma.email.findMany({
      where: {
        status: 'SCHEDULED',
      },
      select: {
        id: true,
        scheduledFor: true,
      },
    });

    let requeuedCount = 0;
    const now = Date.now();

    for (const email of pendingEmails) {
      const scheduledTime = new Date(email.scheduledFor).getTime();
      const delay = Math.max(0, scheduledTime - now);

      // BullMQ jobId guarantees idempotency: if job exists in Redis, this is a no-op
      await emailQueue.add(
        'send-email',
        { emailId: email.id },
        {
          jobId: email.id,
          delay,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
      requeuedCount++;
    }

    logger.info(`Reconciliation complete: re-enqueued/verified ${requeuedCount} scheduled emails.`);
    return requeuedCount;
  } catch (error) {
    logger.error({ error }, 'Reconciliation error during boot');
    return 0;
  } finally {
    // Release lock only if we own it
    try {
      const current = await redis.get(lockKey);
      if (current === lockValue) {
        await redis.del(lockKey);
      }
    } catch {
      // Ignored
    }
  }
}
