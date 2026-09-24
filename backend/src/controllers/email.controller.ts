import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { EmailService } from '../services/email.service';
import { emailQueue } from '../queues/email.queue';
import { reconcilePendingEmails } from '../queues/reconciliation';
import { AuthenticatedUser } from '../types';
import { logger } from '../config/logger';

export class EmailController {
  /**
   * Schedule new emails (batch or single)
   */
  public static async schedule(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;
    const {
      recipients,
      subject,
      body,
      startTime,
      delayBetweenEmailsMs,
      hourlyLimit,
      senderId,
      attachments,
    } = req.body;

    logger.info(`[EmailController.schedule] Received attachments: ${attachments ? `${attachments.length} item(s)` : 'null/undefined'}`);
    if (attachments && attachments.length > 0) {
      attachments.forEach((att: any, i: number) => {
        logger.info(`[EmailController.schedule]   Attachment[${i}]: filename=${att.filename}, contentType=${att.contentType}, contentLength=${att.content?.length || 0}`);
      });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ success: false, message: 'At least one recipient is required' });
      return;
    }

    if (!subject || !body) {
      res.status(400).json({ success: false, message: 'Subject and body are required' });
      return;
    }

    const rawStartTime = startTime || req.body.scheduledFor;
    const scheduledStartTime = rawStartTime ? new Date(rawStartTime) : new Date();

    const rawDelaySec = req.body.delayBetweenEmailsSeconds;
    const delayMs = delayBetweenEmailsMs
      ? Number(delayBetweenEmailsMs)
      : rawDelaySec
      ? Number(rawDelaySec) * 1000
      : 2000;

    if (hourlyLimit && senderId) {
      await prisma.sender.update({
        where: { id: senderId },
        data: { hourlyLimit: Number(hourlyLimit) },
      }).catch(() => {});
    }

    const result = await EmailService.scheduleBatch({
      recipients,
      subject,
      body,
      startTime: scheduledStartTime,
      delayBetweenEmailsMs: delayMs,
      senderId,
      userId: user?.id,
      attachments,
    });

    res.status(201).json({
      success: true,
      message: `Successfully scheduled ${result.count} email(s)`,
      data: result,
    });
  }

  /**
   * Get all scheduled emails
   */
  public static async getScheduled(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Trigger reconciliation asynchronously to pick up any overdue jobs in BullMQ
    reconcilePendingEmails().catch(() => {});

    const whereClause: any = {
      status: 'SCHEDULED',
      ...(user ? { userId: user.id } : {}),
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: whereClause,
        orderBy: { scheduledFor: 'asc' },
        skip,
        take: limit,
        include: {
          sender: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.email.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  /**
   * Get all sent (and failed) emails
   */
  public static async getSent(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      status: { in: ['SENT', 'FAILED'] },
      ...(user ? { userId: user.id } : {}),
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: whereClause,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.email.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  /**
   * Cancel a scheduled email
   */
  public static async cancel(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const user = req.user as AuthenticatedUser;

    const email = await prisma.email.findFirst({
      where: {
        id,
        status: 'SCHEDULED',
        ...(user ? { userId: user.id } : {}),
      },
    });

    if (!email) {
      res.status(404).json({ success: false, message: 'Scheduled email not found' });
      return;
    }

    await prisma.email.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    const job = await emailQueue.getJob(id);
    if (job) {
      await job.remove();
    }

    res.json({ success: true, message: 'Email cancelled successfully' });
  }

  /**
   * Summary stats for dashboard header
   */
  public static async getStats(req: Request, res: Response): Promise<void> {
    const user = req.user as AuthenticatedUser;
    const filter = user ? { userId: user.id } : {};

    const [scheduled, sent, failed] = await Promise.all([
      prisma.email.count({ where: { ...filter, status: 'SCHEDULED' } }),
      prisma.email.count({ where: { ...filter, status: 'SENT' } }),
      prisma.email.count({ where: { ...filter, status: 'FAILED' } }),
    ]);

    res.json({
      success: true,
      data: {
        scheduled,
        sent,
        failed,
        total: scheduled + sent + failed,
      },
    });
  }
}
