import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../config/logger';

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
}

export interface SendEmailResult {
  messageId: string;
  previewUrl?: string | false;
}

// Transporter cache per sender email to avoid re-creating connections
const transporterCache = new Map<string, Transporter>();

export function getOrCreateTransporter(config: SendEmailParams['smtpConfig']): Transporter {
  // Upgrade Ethereal port 587 connections to port 465 SSL to bypass cloud SMTP port blocks
  const isEthereal = config.host.includes('ethereal');
  const port = isEthereal ? 465 : config.port;
  const secure = isEthereal ? true : config.secure;

  const cacheKey = `${config.user}@${config.host}:${port}`;

  if (!transporterCache.has(cacheKey)) {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: port,
      secure: secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000, // 10s connection timeout
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    transporterCache.set(cacheKey, transporter);
  }

  return transporterCache.get(cacheKey)!;
}

export async function sendEmailViaSMTP(params: SendEmailParams): Promise<SendEmailResult> {
  // Always use Port 465 SSL for Ethereal senders to bypass cloud provider port 587 blocks
  const isEthereal = params.smtpConfig.host.includes('ethereal');
  const smtpConfig = {
    ...params.smtpConfig,
    port: isEthereal ? 465 : params.smtpConfig.port,
    secure: isEthereal ? true : params.smtpConfig.secure,
  };

  const transporter = getOrCreateTransporter(smtpConfig);

  const nodemailerAttachments = params.attachments?.map((att: any) => {
    if (att.content) {
      // Extract base64 portion whether it's a data URI or raw base64 string
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

  try {
    const info = await transporter.sendMail({
      from: `"${params.fromName}" <${params.fromEmail}>`,
      to: params.toEmail,
      subject: params.subject,
      html: params.body,
      text: params.body.replace(/<[^>]*>?/gm, ''), // fallback plain text
      attachments: nodemailerAttachments,
    });

    let previewUrl = nodemailer.getTestMessageUrl(info);
    if (!previewUrl && params.smtpConfig.host.includes('ethereal')) {
      previewUrl = 'https://ethereal.email/messages';
    }

    if (previewUrl) {
      logger.info(`Ethereal Email sent! Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  } catch (err: any) {
    // Fail-safe: If Ethereal credentials expired or timed out on cloud provider, create a fresh live Ethereal account on the fly
    if (params.smtpConfig.host.includes('ethereal')) {
      logger.warn(`Ethereal SMTP attempt failed (${err.message}). Creating fresh live Ethereal test account on the fly...`);
      try {
        const freshAccount = await nodemailer.createTestAccount();
        const freshTransporter = nodemailer.createTransport({
          host: freshAccount.smtp.host,
          port: 465,
          secure: true,
          auth: {
            user: freshAccount.user,
            pass: freshAccount.pass,
          },
          connectionTimeout: 10000,
        });

        const freshInfo = await freshTransporter.sendMail({
          from: `"${params.fromName}" <${freshAccount.user}>`,
          to: params.toEmail,
          subject: params.subject,
          html: params.body,
          text: params.body.replace(/<[^>]*>?/gm, ''),
          attachments: nodemailerAttachments,
        });

        const liveUrl = nodemailer.getTestMessageUrl(freshInfo);
        logger.info(`✅ Fresh Ethereal Email sent on the fly! Live Preview URL: ${liveUrl}`);

        return {
          messageId: freshInfo.messageId,
          previewUrl: liveUrl || 'https://ethereal.email/messages',
        };
      } catch (freshErr: any) {
        logger.error({ freshErr }, 'Fresh Ethereal account creation failed');
      }
    }
    throw err;
  }
}
