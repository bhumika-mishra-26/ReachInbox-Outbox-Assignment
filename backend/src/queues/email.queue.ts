import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { EmailJobData } from '../types';

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true, // remove successfully sent jobs to keep Redis lean
    removeOnFail: false,     // keep failed jobs in Redis for inspection in Bull Board
  },
});
