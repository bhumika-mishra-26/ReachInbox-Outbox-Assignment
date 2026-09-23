import axios, { AxiosError } from 'axios';
import type {
  User,
  ScheduledEmail,
  SentEmail,
  Sender,
  ScheduleEmailRequest,
  SearchResult,
  SlackStatus,
} from '@/types';
import {
  MOCK_USER,
  MOCK_SENDERS,
  MOCK_SCHEDULED,
  MOCK_SENT,
  MOCK_SLACK_STATUS,
  MOCK_SEARCH,
} from './mockData';

// ─── Mock Mode Detection ──────────────────────────────────────────────────────
// Set NEXT_PUBLIC_MOCK_MODE=true in .env.local to bypass the backend entirely.

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

// Simulates a small network delay in mock mode so loading spinners are visible
const mockDelay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

// ─── Axios Instance ───────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

function extractMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.message || err.message || 'Something went wrong';
  }
  return 'Something went wrong';
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  googleLoginUrl: () => `${BASE_URL}/auth/google`,

  login: async (email: string, password: string): Promise<User> => {
    if (IS_MOCK) {
      await mockDelay();
      // Accept any credentials in mock mode
      return { ...MOCK_USER, email, name: email.split('@')[0] };
    }
    try {
      const { data } = await api.post<{ user: User }>('/api/auth/login', { email, password });
      return data.user;
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  },

  register: async (name: string, email: string, password: string): Promise<User> => {
    if (IS_MOCK) {
      await mockDelay();
      return { ...MOCK_USER, name, email };
    }
    try {
      const { data } = await api.post<{ user: User }>('/api/auth/register', { name, email, password });
      return data.user;
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  },

  logout: async (): Promise<void> => {
    if (IS_MOCK) { await mockDelay(200); return; }
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
  },

  me: async (): Promise<User | null> => {
    if (IS_MOCK) {
      // Read mock session from localStorage (set during mock login)
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem('mock_user');
      return stored ? JSON.parse(stored) : null;
    }
    try {
      const { data } = await api.get<{ user: User }>('/api/auth/me');
      return data.user;
    } catch {
      return null;
    }
  },
};

// ─── Emails ───────────────────────────────────────────────────────────────────

export const emailApi = {
  getScheduled: async (): Promise<ScheduledEmail[]> => {
    if (IS_MOCK) { await mockDelay(); return MOCK_SCHEDULED; }
    try {
      const { data } = await api.get<{ data: ScheduledEmail[] }>('/api/emails/scheduled');
      return data.data;
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  },

  getSent: async (): Promise<SentEmail[]> => {
    if (IS_MOCK) { await mockDelay(); return MOCK_SENT; }
    try {
      const { data } = await api.get<{ data: SentEmail[] }>('/api/emails/sent');
      return data.data;
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  },

  schedule: async (payload: ScheduleEmailRequest): Promise<{ jobIds: string[] }> => {
    if (IS_MOCK) {
      await mockDelay(1200);
      return { jobIds: payload.recipients.map((_, i) => `mock-job-${i}`) };
    }
    try {
      const { data } = await api.post<{ jobIds: string[] }>('/api/emails/schedule', payload);
      return data;
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  },

  cancel: async (emailId: string): Promise<void> => {
    if (IS_MOCK) { await mockDelay(300); return; }
    try {
      await api.delete(`/api/emails/${emailId}`);
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  },
};

// ─── Senders ──────────────────────────────────────────────────────────────────

export const senderApi = {
  list: async (): Promise<Sender[]> => {
    if (IS_MOCK) { await mockDelay(400); return MOCK_SENDERS; }
    try {
      const { data } = await api.get<{ data: Sender[] }>('/api/senders');
      return data.data;
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  },
};

// ─── Search ───────────────────────────────────────────────────────────────────

export const searchApi = {
  search: async (query: string): Promise<SearchResult[]> => {
    if (IS_MOCK) {
      await mockDelay(300);
      return MOCK_SEARCH.filter(
        (r) =>
          r.subject.toLowerCase().includes(query.toLowerCase()) ||
          r.recipient.toLowerCase().includes(query.toLowerCase()) ||
          r.body.toLowerCase().includes(query.toLowerCase())
      );
    }
    try {
      const { data } = await api.get<{ data: SearchResult[] }>('/api/search', { params: { q: query } });
      return data.data;
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  },
};

// ─── Slack ────────────────────────────────────────────────────────────────────

export const slackApi = {
  status: async (): Promise<SlackStatus> => {
    if (IS_MOCK) { await mockDelay(200); return MOCK_SLACK_STATUS; }
    try {
      const { data } = await api.get<SlackStatus>('/api/slack/status');
      return data;
    } catch {
      return { connected: false };
    }
  },

  connectUrl: () => `${BASE_URL}/api/slack/connect`,

  disconnect: async (): Promise<void> => {
    if (IS_MOCK) { await mockDelay(200); return; }
    try {
      await api.post('/api/slack/disconnect');
    } catch (err) {
      throw new Error(extractMessage(err));
    }
  },
};

export default api;
