import { redis } from '../config/redis';
import { logger } from '../config/logger';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  retryAfterMs?: number;
}

export class RateLimitService {
  /**
   * Generates the Redis key for a given sender and the current UTC hour window
   * Format: ratelimit:{senderId}:{YYYY-MM-DDTHH}
   */
  public static getHourWindowKey(senderId: string, timestamp: number = Date.now()): string {
    const date = new Date(timestamp);
    const hourPrefix = date.toISOString().slice(0, 13); // e.g. "2026-09-22T22"
    return `ratelimit:${senderId}:${hourPrefix}`;
  }

  /**
   * Calculates milliseconds remaining until the start of the next hour window
   */
  public static getMillisecondsUntilNextHour(timestamp: number = Date.now()): number {
    const msIntoCurrentHour = timestamp % 3600000;
    const msRemaining = 3600000 - msIntoCurrentHour;
    // Add a tiny 1-second buffer to ensure the next attempt lands squarely in the next window
    return msRemaining + 1000;
  }

  /**
   * Atomically checks and increments the sender's hourly send counter.
   * If the limit is exceeded, rolls back the counter and returns allowed: false.
   */
  public static async checkAndIncrement(senderId: string, limit: number): Promise<RateLimitResult> {
    const now = Date.now();
    const key = this.getHourWindowKey(senderId, now);

    try {
      const count = await redis.incr(key);

      // Set TTL on key creation (3700 seconds gives safe 100s buffer after hour expires)
      if (count === 1) {
        await redis.expire(key, 3700);
      }

      if (count > limit) {
        // Roll back the counter since this email will NOT be sent this hour
        await redis.decr(key);
        const retryAfterMs = this.getMillisecondsUntilNextHour(now);

        logger.warn(
          `[RateLimit] Sender ${senderId} hit hourly limit (${limit}). Rescheduling in ${Math.round(
            retryAfterMs / 1000
          )}s`
        );

        return {
          allowed: false,
          currentCount: limit,
          limit,
          retryAfterMs,
        };
      }

      return {
        allowed: true,
        currentCount: count,
        limit,
      };
    } catch (error) {
      logger.error({ error }, '[RateLimit] Redis error while checking rate limit');
      // Fallback: If Redis has a transient error, allow email through to prevent deadlock
      return {
        allowed: true,
        currentCount: 0,
        limit,
      };
    }
  }

  /**
   * Gets current count for a sender in the current hour window without incrementing
   */
  public static async getCurrentCount(senderId: string): Promise<number> {
    const key = this.getHourWindowKey(senderId);
    try {
      const count = await redis.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }
}
