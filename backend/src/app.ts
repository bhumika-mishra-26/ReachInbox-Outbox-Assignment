import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import passport from 'passport';
import { env } from './config/env';
import { redis } from './config/redis';
import { prisma } from './db/prisma';
import { checkElasticsearchHealth } from './config/elasticsearch';
import { configurePassport } from './auth/passport';
import { bullBoardAdapter } from './queues/bullboard';
import { errorHandler } from './middlewares/error.middleware';

// Import Routes
import authRoutes from './routes/auth.routes';
import authLocalRoutes from './routes/auth.local.routes';
import emailRoutes from './routes/email.routes';
import senderRoutes from './routes/sender.routes';
import slackRoutes from './routes/slack.routes';
import searchRoutes from './routes/search.routes';

const app = express();

// 0. Trust Proxy (Required for Render / cloud reverse proxies to pass HTTPS cookies properly)
app.set('trust proxy', 1);

// 1. CORS Configuration
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive CORS for demo deployment
    },
    credentials: true,
  })
);

// 2. Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Redis Session Store
const redisStore = new RedisStore({
  client: redis,
  prefix: 'reachinbox:sess:',
});

app.use(
  session({
    store: redisStore,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);

// 4. Passport Authentication Setup
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// 5. Bull Board Queue Monitoring Dashboard
app.use('/admin/queues', bullBoardAdapter.getRouter());

// 6. Healthcheck endpoint
app.get('/healthz', async (_req, res) => {
  let dbOk = false;
  let redisOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  try {
    const ping = await redis.ping();
    redisOk = ping === 'PONG';
  } catch {
    redisOk = false;
  }

  const esOk = await checkElasticsearchHealth();

  const isHealthy = dbOk && redisOk;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    services: {
      database: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down',
      elasticsearch: esOk ? 'up' : 'down',
    },
  });
});

// 7. REST API Routes
app.use('/auth', authRoutes);
app.use('/api/auth', authLocalRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/senders', senderRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/search', searchRoutes);

// 8. Global Error Handler
app.use(errorHandler);

export default app;
