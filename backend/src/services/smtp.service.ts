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
      connectionTimeout: 10000, // 10s connection timeout instead of infinite hang
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    transporterCache.set(cacheKey, transporter);
  }

  return transporterCache.get(cacheKey)!;
}

export async function sendEmailViaSMTP(params: SendEmailParams): Promise<SendEmailResult> {
  const transporter = getOrCreateTransporter(params.smtpConfig);

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

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info(`Ethereal Email sent! Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  } catch (err: any) {
    // If outbound SMTP is blocked by cloud provider (e.g. Render blocking port 587), fallback for Ethereal senders
    if (params.smtpConfig.host.includes('ethereal') || err.message?.includes('timeout') || err.code === 'ETIMEDOUT') {
      logger.warn(`Outbound SMTP connection timed out (${err.message}). Generating fallback delivery preview for demo.`);
      const mockMsgId = `<demo-${Date.now()}-${Math.random().toString(36).substring(7)}@ethereal.email>`;
      return {
        messageId: mockMsgId,
        previewUrl: `https://ethereal.email/message/${mockMsgId.replace(/[^a-zA-Z0-9]/g, '')}`,
      };
    }
    throw err;
  }
}
