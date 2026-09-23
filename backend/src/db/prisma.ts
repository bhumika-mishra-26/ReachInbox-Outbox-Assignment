import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

declare global {
  // Prevent multiple PrismaClient instances in development due to hot reloading
  // eslint-disable-next-line no-var
  var globalPrisma: PrismaClient | undefined;
}

export const prisma =
  global.globalPrisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.globalPrisma = prisma;
}

// Auto-reconnect helper on connection termination
prisma
  .$connect()
  .then(() => {
    logger.info('Database connected successfully via Prisma');
  })
  .catch((err: Error) => {
    logger.error({ err }, 'Failed to connect to database via Prisma');
  });

/**
 * Execute a Prisma database action with retry on transient serverless disconnects (e.g. Neon scale-to-zero)
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isConnectionError =
        error?.code === 'P1001' || // Cannot reach DB
        error?.code === 'P1002' || // DB server timed out
        error?.code === 'P1017' || // Server closed connection
        error?.message?.includes('terminating connection') ||
        error?.message?.includes('administrator command');

      if (isConnectionError && attempt < retries) {
        logger.warn(`Prisma connection terminated by serverless DB. Retrying attempt ${attempt}/${retries}...`);
        await prisma.$connect().catch(() => {});
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Database operation failed after maximum retries');
}
