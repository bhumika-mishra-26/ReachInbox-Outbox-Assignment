import type { ScheduledEmail, SentEmail, Sender, User, SlackStatus, SearchResult } from '@/types';

// ─── Mock User ────────────────────────────────────────────────────────────────

export const MOCK_USER: User = {
  id: 'mock-user-1',
  name: 'Oliver Brown',
  email: 'oliver.brown@domain.io',
  avatar: undefined,
};

// ─── Mock Senders ─────────────────────────────────────────────────────────────

export const MOCK_SENDERS: Sender[] = [
  { id: 'sender-1', email: 'oliver.brown@domain.io', name: 'Oliver Brown', hourlyLimit: 200 },
  { id: 'sender-2', email: 'ramit.gupta@domain.io', name: 'Ramit Gupta', hourlyLimit: 150 },
  { id: 'sender-3', email: 'sales@company.io', name: 'Sales Team', hourlyLimit: 500 },
];

// ─── Mock Scheduled Emails ────────────────────────────────────────────────────

export const MOCK_SCHEDULED: ScheduledEmail[] = [
  {
    id: 'sch-1',
    recipient: 'john.smith@example.com',
    recipientName: 'John Smith',
    subject: 'Meeting follow-up',
    body: '<p>Hi John, just wanted to follow up on our meeting last Tuesday. Could we schedule a call this week?</p><p>Best,<br/>Oliver</p>',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30 mins from now
    status: 'SCHEDULED',
    senderId: 'sender-1',
    senderEmail: 'oliver.brown@domain.io',
    delaySeconds: 2,
    hourlyLimit: 200,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sch-2',
    recipient: 'olive@example.com',
    recipientName: 'Olive',
    subject: "Ramit, great to meet you - you'll love it",
    body: "<p>Hi Olive, just wanted to follow up on our meeting. I think you'll love what we have in store.</p><p>Best,<br/>Oliver</p>",
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // 2 hours from now
    status: 'SCHEDULED',
    senderId: 'sender-2',
    senderEmail: 'ramit.gupta@domain.io',
    delaySeconds: 5,
    hourlyLimit: 150,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sch-3',
    recipient: 'sarah@techcorp.com',
    recipientName: 'Sarah',
    subject: 'Q4 outreach campaign',
    body: '<p>Hi Sarah, following up on our Q4 outreach campaign. We have some exciting new features to share with you.</p>',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
    status: 'SCHEDULED',
    senderId: 'sender-3',
    senderEmail: 'sales@company.io',
    delaySeconds: 3,
    hourlyLimit: 500,
    createdAt: new Date().toISOString(),
  },
];

// ─── Mock Sent Emails ─────────────────────────────────────────────────────────

export const MOCK_SENT: SentEmail[] = [
  {
    id: 'sent-1',
    recipient: 'sarah.wilson@example.com',
    recipientName: 'Sarah Wilson',
    subject: 'Re: Project Update',
    body: '<p>Thanks for the update, Sarah. Looks good!</p>',
    sentAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    status: 'SENT',
    senderId: 'sender-1',
    senderEmail: 'oliver.brown@domain.io',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-2',
    recipient: 'support@company.com',
    recipientName: 'Support',
    subject: 'Issue with login',
    body: '<p>I am having trouble logging in to the dashboard. Could you please help me?</p>',
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hrs ago
    status: 'SENT',
    senderId: 'sender-1',
    senderEmail: 'oliver.brown@domain.io',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-3',
    recipient: 'mark@prospectco.com',
    recipientName: 'Mark Johnson',
    subject: 'Exclusive offer — only 4 spots left',
    body: '<p>Hi Mark, we have an exclusive offer available for only a few customers. Reply now to secure your spot.</p>',
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hrs ago
    status: 'SENT',
    senderId: 'sender-2',
    senderEmail: 'ramit.gupta@domain.io',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-4',
    recipient: 'failed@bounce.com',
    recipientName: 'Failed Send',
    subject: 'Test bounce',
    body: '<p>This email failed to deliver.</p>',
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    status: 'FAILED',
    senderId: 'sender-1',
    senderEmail: 'oliver.brown@domain.io',
    createdAt: new Date().toISOString(),
  },
];

// ─── Mock Slack Status ────────────────────────────────────────────────────────

export const MOCK_SLACK_STATUS: SlackStatus = {
  connected: false,
};

// ─── Mock Search Results ──────────────────────────────────────────────────────

export const MOCK_SEARCH: SearchResult[] = [
  {
    id: 'sch-1',
    recipient: 'john.smith@example.com',
    subject: 'Meeting follow-up',
    body: 'Hi John, just wanted to follow up on our meeting last Tuesday.',
    status: 'SCHEDULED',
    senderId: 'sender-1',
    scheduledFor: MOCK_SCHEDULED[0].scheduledFor,
  },
  {
    id: 'sent-1',
    recipient: 'sarah.wilson@example.com',
    subject: 'Re: Project Update',
    body: 'Thanks for the update, Sarah. Looks good!',
    status: 'SENT',
    senderId: 'sender-1',
    sentAt: MOCK_SENT[0].sentAt,
  },
];
