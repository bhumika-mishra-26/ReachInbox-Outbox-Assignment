import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../db/prisma';
import { EMAIL_QUEUE_NAME, emailQueue } from './email.queue';
import { sendEmailViaSMTP } from '../services/smtp.service';
import { RateLimitService } from '../services/ratelimit.service';
import { SlackService } from '../services/slack.service';
import { SearchService } from '../services/search.service';
import { EmailJobData } from '../types';

export function createEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId } = job.data;
      logger.info(`[Worker] Processing email job ${job.id} for email ${emailId}`);

      // 1. Fetch email and sender details
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: {
          sender: true,
        },
      });

      if (!email) {
        logger.warn(`[Worker] Email ${emailId} not found in database. Skipping.`);
        return;
      }

      // If already sent or cancelled, do not resend
      if (email.status === 'SENT') {
        logger.info(`[Worker] Email ${emailId} is already marked SENT. Skipping.`);
        return;
      }
      if (email.status === 'CANCELLED') {
        logger.info(`[Worker] Email ${emailId} is CANCELLED. Skipping.`);
        return;
      }

      const sender = email.sender;
      if (!sender) {
        throw new Error(`Sender not found for email ${emailId}`);
      }

      // 2. Provider Throttling / Delay between individual email sends
      const minDelay = sender.minDelayMs || env.DEFAULT_MIN_DELAY_BETWEEN_EMAILS_MS;
      if (minDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, minDelay));
      }

      // 3. Hourly Rate Limiting check & atomic increment
      const hourlyLimit = sender.hourlyLimit || env.MAX_EMAILS_PER_HOUR_DEFAULT;
      const rateLimitResult = await RateLimitService.checkAndIncrement(sender.id, hourlyLimit);

      if (!rateLimitResult.allowed) {
        const retryAfterMs = rateLimitResult.retryAfterMs || 3600000;
        logger.warn(
          `[Worker] Sender ${sender.email} hit hourly limit (${hourlyLimit}/hr). Rescheduling email ${emailId} in ${Math.round(
            retryAfterMs / 1000
          )}s.`
        );

        // Notify Slack (rate limited to 1 notification per sender per hour)
        await SlackService.notifyRateLimitHit(
          email.userId,
          sender.id,
          sender.email,
          hourlyLimit
        );

        // Reschedule job into next hour window using the SAME jobId for idempotency
        await emailQueue.add(
          'send-email',
          { emailId: email.id },
          {
            jobId: email.id,
            delay: retryAfterMs,
            removeOnComplete: true,
            removeOnFail: false,
          }
        );

        // Exit current attempt cleanly without failing the job
        return;
      }

      // 4. Send email via SMTP (Ethereal or configured SMTP)
      try {
        const atts = (email.attachments as any[]) || undefined;
        if (atts && atts.length > 0) {
          logger.info(`[Worker] Email ${email.id} includes ${atts.length} attachment(s)`);
        }

        const result = await sendEmailViaSMTP({
          fromName: sender.name,
          fromEmail: sender.email,
          toEmail: email.recipient,
          subject: email.subject,
          body: email.body,
          attachments: atts,
          smtpConfig: {
            host: sender.host,
            port: sender.port,
            secure: sender.secure,
            user: sender.user,
            pass: sender.pass,
          },
        });

        // 5. Update DB status to SENT
        const updatedEmail = await prisma.email.update({
          where: { id: email.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            messageId: result.messageId,
            previewUrl: typeof result.previewUrl === 'string' ? result.previewUrl : null,
            errorMessage: null,
          },
        });

        // 6. Update Elasticsearch index (gracefully fail if ES is offline)
        await SearchService.indexEmail({
          id: updatedEmail.id,
          recipient: updatedEmail.recipient,
          subject: updatedEmail.subject,
          body: updatedEmail.body,
          status: updatedEmail.status,
          senderId: updatedEmail.senderId,
          userId: updatedEmail.userId,
          scheduledFor: updatedEmail.scheduledFor,
          sentAt: updatedEmail.sentAt,
        }).catch((err) => {
          logger.debug(`Elasticsearch index skipped or failed for ${updatedEmail.id}: ${err.message}`);
        });

        logger.info(`[Worker] Successfully sent email ${email.id} to ${email.recipient}`);
      } catch (error: any) {
        logger.error(`[Worker] Error sending email ${email.id}:`, error);

        // If this was the last attempt, mark as FAILED
        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
          await prisma.email.update({
            where: { id: email.id },
            data: {
              status: 'FAILED',
              errorMessage: error.message || 'Failed to send email',
            },
          });

          await SearchService.indexEmail({
            id: email.id,
            recipient: email.recipient,
            subject: email.subject,
            body: email.body,
            status: 'FAILED',
            senderId: email.senderId,
            userId: email.userId,
            scheduledFor: email.scheduledFor,
          });
        }

        // Rethrow so BullMQ can handle retries/backoff
        throw error;
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error({ err }, '[Worker] Worker internal error');
  });

  return worker;
}
