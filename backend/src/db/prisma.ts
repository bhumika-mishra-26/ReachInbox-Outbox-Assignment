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
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.globalPrisma = prisma;
}

prisma
  .$connect()
  .then(() => {
    logger.info('Database connected successfully via Prisma');
  })
  .catch((err: Error) => {
    logger.error({ err }, 'Failed to connect to database via Prisma');
  });
