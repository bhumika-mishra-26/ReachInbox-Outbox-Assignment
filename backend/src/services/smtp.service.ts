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
  const cacheKey = `${config.user}@${config.host}:${config.port}`;

  if (!transporterCache.has(cacheKey)) {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
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

  // For Ethereal: dynamically create a live test account so getTestMessageUrl ALWAYS returns a working URL
  if (isEthereal) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const etherealTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: 465,
        secure: true,
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
    } catch (etherealErr: any) {
      logger.error({ etherealErr }, 'Error sending via dynamic Ethereal test account');
    }
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
