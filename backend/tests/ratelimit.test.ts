import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: {
    incr: vi.fn(),
    decr: vi.fn(),
    expire: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../src/config/redis', () => ({
  redis: mockRedis,
  redisConnectionOptions: {},
}));

import { RateLimitService } from '../src/services/ratelimit.service';

describe('RateLimitService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly format hour window key', () => {
    const timestamp = Date.UTC(2026, 8, 22, 15, 30, 0);
    const key = RateLimitService.getHourWindowKey('sender-123', timestamp);
    expect(key).toBe('ratelimit:sender-123:2026-09-22T15');
  });

  it('should correctly compute milliseconds remaining until next hour', () => {
    const timestamp = Date.UTC(2026, 8, 22, 15, 50, 0);
    const remaining = RateLimitService.getMillisecondsUntilNextHour(timestamp);
    expect(remaining).toBe(601000);
  });

  it('should return allowed: false and rollback counter when limit is exceeded', async () => {
    mockRedis.incr.mockResolvedValue(11);
    mockRedis.decr.mockResolvedValue(10);
    mockRedis.expire.mockResolvedValue(1);

    const result = await RateLimitService.checkAndIncrement('sender-test', 10);

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(10);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(mockRedis.decr).toHaveBeenCalled();
  });

  it('should return allowed: true when count is within limit', async () => {
    mockRedis.incr.mockResolvedValue(5);
    mockRedis.expire.mockResolvedValue(1);

    const result = await RateLimitService.checkAndIncrement('sender-test-2', 10);

    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(5);
    expect(result.limit).toBe(10);
  });
});
