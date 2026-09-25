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

  /**
   * Public endpoint — renders a beautiful self-hosted HTML preview of an email.
   * Used as a fallback preview URL when Ethereal SMTP is blocked (e.g. Render free tier).
   * GET /api/emails/:id/preview  (no auth required — URL acts as a shareable preview link)
   */
  public static async renderPreview(req: Request, res: Response): Promise<void> {
    const id = req.params['id'] as string;

    const email = await prisma.email.findUnique({
      where: { id },
    });

    if (!email) {
      res.status(404).send(`
        <!DOCTYPE html><html><head><title>Not Found</title></head>
        <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;">
          <div style="text-align:center;color:#888;">
            <h2>404 — Email not found</h2>
            <p>The preview link may have expired or the email ID is incorrect.</p>
          </div>
        </body></html>
      `);
      return;
    }

    // Fetch sender separately to avoid Prisma include inference issues
    const senderRecord = email.senderId
      ? await prisma.sender.findUnique({
          where: { id: email.senderId },
          select: { name: true, email: true },
        })
      : null;

    const sentAt = email.sentAt
      ? new Date(email.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })
      : null;
    const scheduledFor = email.scheduledFor
      ? new Date(email.scheduledFor).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })
      : null;

    const senderName = senderRecord?.name || 'Unknown Sender';
    const senderEmail = senderRecord?.email || '';

    const statusColor: Record<string, string> = {
      SENT: '#16a34a',
      FAILED: '#dc2626',
      SCHEDULED: '#d97706',
      CANCELLED: '#6b7280',
    };
    const statusBg: Record<string, string> = {
      SENT: '#dcfce7',
      FAILED: '#fee2e2',
      SCHEDULED: '#fef3c7',
      CANCELLED: '#f3f4f6',
    };
    const color = statusColor[email.status] || '#374151';
    const bg = statusBg[email.status] || '#f9fafb';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${email.subject} — ReachInbox Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      padding: 32px 16px;
      color: #1e293b;
    }
    .wrapper { max-width: 720px; margin: 0 auto; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: ${bg};
      color: ${color};
      border: 1px solid ${color}44;
    }
    .header {
      background: white;
      border-radius: 16px 16px 0 0;
      padding: 28px 32px 20px;
      border-bottom: 1px solid #f1f5f9;
    }
    .header-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .logo {
      font-size: 15px;
      font-weight: 700;
      color: #6366f1;
      letter-spacing: -0.02em;
      margin-bottom: 16px;
    }
    .subject {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
      margin-bottom: 16px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .meta-value {
      font-size: 13.5px;
      color: #334155;
      font-weight: 500;
    }
    .body-container {
      background: white;
      padding: 32px;
      border-radius: 0 0 16px 16px;
    }
    .email-body {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      background: #ffffff;
    }
    .email-body iframe {
      width: 100%;
      min-height: 480px;
      border: none;
      display: block;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">⚡ ReachInbox — Email Preview</div>
      <div class="header-top">
        <h1 class="subject">${escapeHtml(email.subject)}</h1>
        <span class="badge">${email.status}</span>
      </div>
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">From</span>
          <span class="meta-value">${escapeHtml(senderName)} &lt;${escapeHtml(senderEmail)}&gt;</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">To</span>
          <span class="meta-value">${escapeHtml(email.recipient)}</span>
        </div>
        ${sentAt ? `
        <div class="meta-item">
          <span class="meta-label">Sent At</span>
          <span class="meta-value">${sentAt} IST</span>
        </div>` : ''}
        ${scheduledFor ? `
        <div class="meta-item">
          <span class="meta-label">Scheduled For</span>
          <span class="meta-value">${scheduledFor} IST</span>
        </div>` : ''}
        ${email.messageId ? `
        <div class="meta-item">
          <span class="meta-label">Message ID</span>
          <span class="meta-value" style="font-size:11px;word-break:break-all;color:#94a3b8;">${escapeHtml(email.messageId)}</span>
        </div>` : ''}
      </div>
    </div>
    <div class="body-container">
      <div class="email-body">
        <iframe
          id="email-frame"
          sandbox="allow-same-origin"
          srcdoc="${escapeAttr(email.body)}"
        ></iframe>
      </div>
    </div>
    <div class="footer">
      <p>Rendered by <a href="https://reachinbox-outbox-assignment.onrender.com" target="_blank">ReachInbox</a> &mdash; Email ID: <code>${email.id}</code></p>
    </div>
  </div>
  <script>
    // Auto-resize iframe to content height
    const frame = document.getElementById('email-frame');
    frame.addEventListener('load', () => {
      try {
        const h = frame.contentDocument.body.scrollHeight;
        frame.style.minHeight = (h + 40) + 'px';
      } catch(e) {}
    });
  </script>
</body>
</html>`);

    function escapeHtml(str: string) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function escapeAttr(str: string) {
      return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }
  }
}
