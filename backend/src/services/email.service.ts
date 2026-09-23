import { prisma } from '../db/prisma';
import { emailQueue } from '../queues/email.queue';
import { SearchService } from './search.service';
import { logger } from '../config/logger';
import { env } from '../config/env';

export interface ScheduleBatchParams {
  recipients: string[];
  subject: string;
  body: string;
  startTime: Date;
  delayBetweenEmailsMs?: number;
  senderId?: string;
  userId?: string;
  attachments?: any[];
}

export class EmailService {
  /**
   * Schedules a batch of emails, stores them in PostgreSQL, indexes them in Elasticsearch,
   * and enqueues delayed jobs into BullMQ.
   */
  public static async scheduleBatch(params: ScheduleBatchParams): Promise<{
    count: number;
    emails: any[];
  }> {
    const { recipients, subject, body, startTime, delayBetweenEmailsMs = 2000, userId, attachments } = params;

    // 1. Resolve sender
    let senderId = params.senderId;
    if (!senderId) {
      // Find default sender
      let defaultSender = await prisma.sender.findFirst({
        where: userId ? { OR: [{ userId }, { userId: null }] } : undefined,
        orderBy: { createdAt: 'asc' },
      });

      // If no active sender exists in DB, fallback to auto-creating from environment variables (Gmail / SMTP)
      if (!defaultSender) {
        const smtpUser = env.GMAIL_USER || env.SMTP_USER;
        const smtpPass = env.GMAIL_APP_PASSWORD || env.SMTP_PASS;

        if (smtpUser && smtpPass) {
          defaultSender = await prisma.sender.create({
            data: {
              name: `Gmail (${smtpUser})`,
              email: smtpUser,
              host: env.SMTP_HOST || 'smtp.gmail.com',
              port: env.SMTP_PORT || 587,
              secure: env.SMTP_SECURE || false,
              user: smtpUser,
              pass: smtpPass.replace(/\s+/g, ''),
              hourlyLimit: env.MAX_EMAILS_PER_HOUR_DEFAULT || 200,
              minDelayMs: env.DEFAULT_MIN_DELAY_BETWEEN_EMAILS_MS || 2000,
              userId: userId || null,
            },
          });
          logger.info(`Auto-created Gmail SMTP sender from environment variables: ${smtpUser}`);
        }
      }

      if (!defaultSender) {
        throw new Error(
          'No active email sender configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env or configure a sender in the dashboard.'
        );
      }
      senderId = defaultSender.id;
    }

    const createdEmails: any[] = [];
    const now = Date.now();
    const baseStartTime = Math.max(startTime.getTime(), now);

    // 1.5 Process and upload attachments to Neon S3 storage bucket
    let processedAttachments: any[] | undefined = undefined;
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const { StorageService } = require('./storage.service');
      processedAttachments = await Promise.all(
        attachments.map(async (att) => {
          if (att.content) {
            const uploaded = await StorageService.uploadUserAttachment(userId, att);
            return {
              filename: uploaded.filename,
              contentType: uploaded.contentType,
              size: uploaded.size,
              s3Key: uploaded.s3Key,
              url: uploaded.url,
              content: att.content, // preserve base64 for inline email sending if needed
            };
          }
          return att;
        })
      );
    }

    // 2. Prepare database records with staggered scheduledFor times
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i].trim();
      if (!recipient) continue;

      // Stagger scheduled time for each recipient to enforce minimum delay between sends
      const scheduledTimestamp = baseStartTime + i * delayBetweenEmailsMs;
      const scheduledFor = new Date(scheduledTimestamp);

      const emailRecord = await prisma.email.create({
        data: {
          recipient,
          subject,
          body,
          attachments: processedAttachments ? processedAttachments : undefined,
          status: 'SCHEDULED',
          scheduledFor,
          senderId,
          userId: userId || null,
        },
      });

      createdEmails.push(emailRecord);

      // Index in Elasticsearch immediately so scheduled emails are instantly searchable
      SearchService.indexEmail({
        id: emailRecord.id,
        recipient: emailRecord.recipient,
        subject: emailRecord.subject,
        body: emailRecord.body,
        status: emailRecord.status,
        senderId: emailRecord.senderId,
        userId: emailRecord.userId,
        scheduledFor: emailRecord.scheduledFor,
      }).catch((err) => {
        logger.warn(`Search indexing error for email ${emailRecord.id}: ${err.message}`);
      });

      // 3. Enqueue into BullMQ with exact delay and idempotent jobId
      const delay = Math.max(0, scheduledTimestamp - Date.now());

      await emailQueue.add(
        'send-email',
        { emailId: emailRecord.id },
        {
          jobId: emailRecord.id, // Idempotent key
          delay,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
    }

    logger.info(
      `Successfully scheduled ${createdEmails.length} emails starting at ${new Date(baseStartTime).toISOString()}`
    );

    return {
      count: createdEmails.length,
      emails: createdEmails,
    };
  }
}
