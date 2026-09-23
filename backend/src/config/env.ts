import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),

  SESSION_SECRET: z.string().default('reachinbox_default_session_secret_change_in_prod'),
  JWT_SECRET: z.string().default('reachinbox_default_jwt_secret_change_in_prod'),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/auth/google/callback'),

  SLACK_CLIENT_ID: z.string().optional().default(''),
  SLACK_CLIENT_SECRET: z.string().optional().default(''),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:5000/api/slack/callback'),

  WORKER_CONCURRENCY: z.coerce.number().default(5),
  DEFAULT_MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR_DEFAULT: z.coerce.number().default(200),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  GMAIL_USER: z.string().optional().default(''),
  GMAIL_APP_PASSWORD: z.string().optional().default(''),

  AWS_ENDPOINT_URL_S3: z.string().optional().default(''),
  AWS_ACCESS_KEY_ID: z.string().optional().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(''),
  AWS_REGION: z.string().optional().default('us-east-2'),
  S3_BUCKET_NAME: z.string().optional().default('attachments'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
