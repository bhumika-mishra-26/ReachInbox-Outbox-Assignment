export interface ScheduleEmailPayload {
  recipients: string[];
  subject: string;
  body: string;
  startTime: string; // ISO string or timestamp
  delayBetweenEmailsMs?: number;
  hourlyLimit?: number;
  senderId?: string;
  attachments?: any[];
}

export interface EmailJobData {
  emailId: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  retryAfterMs?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role: string;
}

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}
