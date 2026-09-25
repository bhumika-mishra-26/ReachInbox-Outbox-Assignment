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

  // If user provided an Ethereal config with credentials, use it normalized to Port 587 / STARTTLS
  if (isEthereal && params.smtpConfig.user && params.smtpConfig.pass) {
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
    if (previewUrl) {
      logger.info(`✅ Ethereal Email sent! Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  }

  // Dynamic Ethereal account fallback if no credentials provided
  if (isEthereal) {
    const testAccount = await nodemailer.createTestAccount();
    const etherealTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port || 587,
      secure: testAccount.smtp.secure || false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      connectionTimeout: 10000,
    });

    const info = await etherealTransporter.sendMail({
      from: `"${params.fromName}" <${params.fromEmail}>`,
      to: params.toEmail,
      subject: params.subject,
      html: params.body,
      text: params.body.replace(/<[^>]*>?/gm, ''),
      attachments: nodemailerAttachments,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info(`✅ Live Ethereal Email sent! Preview URL: ${previewUrl}`);

    return {
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  }

  // Regular SMTP sending (Gmail / Custom SMTP)
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
  return {
    messageId: info.messageId,
    previewUrl: previewUrl || undefined,
  };
}
