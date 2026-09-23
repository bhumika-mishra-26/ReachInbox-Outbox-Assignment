import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRedis, mockQueue } = vi.hoisted(() => ({
  mockRedis: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
  },
  mockQueue: {
    add: vi.fn(),
  },
}));

vi.mock('../src/config/redis', () => ({
  redis: mockRedis,
  redisConnectionOptions: {},
}));

vi.mock('../src/queues/email.queue', () => ({
  emailQueue: mockQueue,
  EMAIL_QUEUE_NAME: 'email-queue',
}));

import { reconcilePendingEmails } from '../src/queues/reconciliation';
import { prisma } from '../src/db/prisma';

describe('reconcilePendingEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should acquire lock and re-enqueue scheduled emails idempotently', async () => {
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue('lock-val');
    mockRedis.del.mockResolvedValue(1);

    const futureTime = new Date(Date.now() + 60000);
    vi.spyOn(prisma.email, 'findMany').mockResolvedValue([
      { id: 'email-1', scheduledFor: futureTime },
      { id: 'email-2', scheduledFor: futureTime },
    ] as any);

    mockQueue.add.mockResolvedValue({} as any);

    const count = await reconcilePendingEmails();

    expect(count).toBe(2);
    expect(mockQueue.add).toHaveBeenCalledTimes(2);
    expect(mockQueue.add).toHaveBeenCalledWith(
      'send-email',
      { emailId: 'email-1' },
      expect.objectContaining({ jobId: 'email-1' })
    );
  });

  it('should skip if another instance holds the reconciliation lock', async () => {
    mockRedis.set.mockResolvedValue(null); // Lock not acquired

    const count = await reconcilePendingEmails();

    expect(count).toBe(0);
  });
});
