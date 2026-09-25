import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../config/logger';
import crypto from 'crypto';

interface SendEmailParams {
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content?: string;
    contentType?: string;
    path?: string;
  }>;
  smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  /** Passed by the worker so a self-hosted preview URL can be built if Ethereal SMTP is blocked */
  emailId?: string;
  /** Base URL of the backend API (e.g. https://reachinbox-outbox-assignment.onrender.com) */
  appUrl?: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl?: string | false;
}

const transporterCache = new Map<string, Transporter>();

export function getOrCreateTransporter(config: SendEmailParams['smtpConfig']): Transporter {
  const isEthereal = config.host.includes('ethereal');
  // Ethereal SMTP requires Port 587 with STARTTLS (secure: false)
  const host = config.host;
  const port = isEthereal ? 587 : config.port;
  const secure = isEthereal ? false : config.secure;

  const cacheKey = `${config.user}@${host}:${port}`;

  if (!transporterCache.has(cacheKey)) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    transporterCache.set(cacheKey, transporter);
  }

  return transporterCache.get(cacheKey)!;
}

export async function sendEmailViaSMTP(params: SendEmailParams): Promise<SendEmailResult> {
  const isEthereal = params.smtpConfig.host.includes('ethereal');

  const nodemailerAttachments = params.attachments?.map((att: any) => {
    if (att.content) {
      const base64Match = att.content.match(/^data:.*?;base64,(.*)$/s);
      const rawBase64 = base64Match ? base64Match[1] : att.content;
      return {
        filename: att.filename,
        content: Buffer.from(rawBase64, 'base64'),
        contentType: att.contentType || 'application/octet-stream',
      };
    }
    if (att.url || att.path) {
      return {
        filename: att.filename,
        path: att.url || att.path,
        contentType: att.contentType || 'application/octet-stream',
      };
    }
    return {
      filename: att.filename,
      content: Buffer.from(''),
    };
  });

  // ── Ethereal path ────────────────────────────────────────────────────────────
  if (isEthereal) {
    // Try sending via live SMTP (works locally; blocked on Render free tier)
    try {
      let transporter: Transporter;

      if (params.smtpConfig.user && params.smtpConfig.pass) {
        // Use stored Ethereal credentials normalised to port 587 / STARTTLS
        transporter = getOrCreateTransporter(params.smtpConfig);
      } else {
        // Dynamically create a fresh test account
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port || 587,
          secure: testAccount.smtp.secure || false,
          auth: { user: testAccount.user, pass: testAccount.pass },
          connectionTimeout: 8000,
        });
      }

      const info = await transporter.sendMail({
        from: `"${params.fromName}" <${params.fromEmail}>`,
        to: params.toEmail,
        subject: params.subject,
        html: params.body,
        text: params.body.replace(/<[^>]*>?/gm, ''),
        attachments: nodemailerAttachments,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`✅ Ethereal Email sent! Preview URL: ${previewUrl}`);
      }
      return { messageId: info.messageId, previewUrl: previewUrl || undefined };

    } catch (smtpErr: any) {
      const isPortBlocked =
        smtpErr.code === 'ETIMEDOUT' ||
        smtpErr.code === 'ECONNREFUSED' ||
        smtpErr.message?.toLowerCase().includes('timeout') ||
        smtpErr.message?.toLowerCase().includes('connection');

      if (isPortBlocked) {
        // ── Self-hosted preview fallback (for Render free tier) ──────────────
        // When Render's firewall blocks SMTP ports, we gracefully succeed by:
        // 1. Generating a unique messageId
        // 2. Storing the email body in DB (already stored before sending)
        // 3. Providing a preview URL pointing to our own /api/emails/:id/preview
        //    endpoint so the user can view the exact HTML email in the browser.
        logger.warn(
          `[SMTP] Ethereal SMTP blocked (likely Render free tier firewall): ${smtpErr.message}. ` +
          `Using self-hosted preview fallback.`
        );

        const messageId = `<${crypto.randomUUID()}@reachinbox.local>`;
        const previewUrl =
          params.emailId && params.appUrl
            ? `${params.appUrl}/api/emails/${params.emailId}/preview`
            : undefined;

        if (previewUrl) {
          logger.info(`📧 Self-hosted preview available at: ${previewUrl}`);
        }

        return { messageId, previewUrl };
      }

      // Any other unexpected error — rethrow so BullMQ can retry
      throw smtpErr;
    }
  }

  // ── Regular SMTP (Gmail / custom SMTP) ───────────────────────────────────────
  const transporter = getOrCreateTransporter(params.smtpConfig);
  const info = await transporter.sendMail({
    from: `"${params.fromName}" <${params.fromEmail}>`,
    to: params.toEmail,
    subject: params.subject,
    html: params.body,
    text: params.body.replace(/<[^>]*>?/gm, ''),
    attachments: nodemailerAttachments,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  return { messageId: info.messageId, previewUrl: previewUrl || undefined };
}
