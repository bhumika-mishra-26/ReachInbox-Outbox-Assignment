import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  ...(env.REDIS_PASSWORD ? { tls: { rejectUnauthorized: false } } : {}),
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    logger.warn(`Redis reconnecting attempt ${times} in ${delay}ms...`);
    return delay;
  },
};

// Singleton Redis client for app-wide use (rate limiting, locks, etc.)
export const redis = new Redis(redisConnectionOptions);

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis error');
});
