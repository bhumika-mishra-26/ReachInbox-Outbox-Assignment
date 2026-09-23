// ─── Auth ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// ─── Emails ─────────────────────────────────────────────────────────────────

export type EmailStatus = 'SCHEDULED' | 'SENT' | 'FAILED' | 'PENDING';

export interface EmailAttachment {
  filename: string;
  size?: number;
  contentType?: string;
  content?: string; // base64 string or data URL
  url?: string;
  s3Key?: string;
}

export interface ScheduledEmail {
  id: string;
  recipient: string;
  recipientName?: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  scheduledFor: string; // ISO string
  status: 'SCHEDULED' | 'PENDING';
  senderId: string;
  senderEmail?: string;
  delaySeconds?: number;
  hourlyLimit?: number;
  createdAt: string;
}

export interface SentEmail {
  id: string;
  recipient: string;
  recipientName?: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  sentAt: string; // ISO string
  status: 'SENT' | 'FAILED';
  senderId: string;
  senderEmail?: string;
  previewUrl?: string;
  createdAt: string;
}

export interface EmailListItem {
  id: string;
  recipient: string;
  recipientName?: string;
  subject: string;
  bodyPreview: string;
  timestamp: string;
  status: EmailStatus;
  senderEmail?: string;
  body?: string;
  attachments?: EmailAttachment[];
}

// ─── Senders ─────────────────────────────────────────────────────────────────

export interface Sender {
  id: string;
  email: string;
  name: string;
  hourlyLimit?: number;
}

// ─── Compose ─────────────────────────────────────────────────────────────────

export interface ComposeFormData {
  from: string;        // senderId
  to: string[];        // recipient email addresses
  subject: string;
  body: string;        // HTML string from rich text editor
  delaySeconds: number;
  hourlyLimit: number;
  startTime: string;   // ISO string for scheduled send time
}

export interface ScheduleEmailRequest {
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledFor: string;
  delayBetweenEmailsSeconds: number;
  hourlyLimit: number;
  attachments?: EmailAttachment[];
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  senderId: string;
  sentAt?: string;
  scheduledFor?: string;
}

// ─── Slack ───────────────────────────────────────────────────────────────────

export interface SlackStatus {
  connected: boolean;
  teamName?: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
}
