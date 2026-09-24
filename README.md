# ReachInbox Full-Stack Email Job Scheduler

Production-grade, horizontally scalable email scheduler service and dashboard built for ReachInbox (Outbox Labs).

---

## 🌟 Key Architecture & Highlights

- **Queue Architecture**: Powered by **BullMQ** backed by **Redis** (configured with `--appendonly yes` for full AOF durability). **Zero cron jobs** are used.
- **Restart Survival Guarantee**: On worker process boot, `reconciliation.ts` scans PostgreSQL for all pending `SCHEDULED` emails and re-adds them idempotently using their database UUID as `jobId`. If a job already exists in Redis, BullMQ no-ops, preventing duplicate sends while ensuring future emails are never lost.
- **Provider Throttling & Minimum Delay**: Enforces configurable minimum spacing (default: 2s) between individual email dispatches.
- **Hourly Rate Limiting**: Multi-sender rate limiter using atomic Redis hour-window counters (`ratelimit:{senderId}:{YYYY-MM-DDTHH}`). Excess emails are not dropped; they are cleanly rescheduled to the next hour window (`msUntilNextHour`).
- **Slack OAuth & Real-Time Alerts**: Real OAuth authorization flow storing incoming webhooks per user. The moment a sender hits their hourly limit, a real alert is dispatched to their Slack workspace. If Slack is not connected or revoked, it gracefully no-ops without crashing.
- **Elasticsearch Searchability**: Scheduled and sent emails are indexed in Elasticsearch and searchable in real time across recipient, subject, and body.
- **Process Separation**: API server (`server.ts`) and Worker process (`worker.ts`) run in separate processes for independent horizontal scaling.
- **Queue Visibility**: Live Bull Board dashboard mounted at `/admin/queues`.

---

## 🎥 Project Demo Video

### ▶️ Watch the Complete Project Demo

[**Watch ReachInbox Demo Video on Google Drive**](https://drive.google.com/file/d/1HM0QV8AtuEOqqayObyq7xU-2gVE0sDdJ/view?usp=sharing)

The demo video showcases the working application, including email scheduling, BullMQ + Redis queue processing, rate limiting, dashboard functionality, Elasticsearch search, Slack integration, and queue monitoring.

---

## 🛠 Tech Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Queue & Job Scheduling**: BullMQ with Redis 7 / Upstash Redis
- **Database**: PostgreSQL 16 (Neon Serverless DB) with Prisma ORM
- **Search**: Elasticsearch 8.13
- **SMTP**: Ethereal Email (fake SMTP) & Gmail / Custom SMTP
- **Attachment Storage**: S3 Bucket Storage (Neon DB S3 / AWS S3)
- **Auth**: Google OAuth 2.0 + Session / JWT Auth
- **Frontend**: Next.js (React), TypeScript, Tailwind CSS

---

## 🚀 Quick Start Guide & How to Run

### 1. Prerequisites & Infra Setup (Docker)

Ensure Docker Desktop is running, then start Redis, PostgreSQL, and Elasticsearch (or use remote services like Neon DB and Upstash Redis):

```bash
docker compose up -d
```

This provisions:
- **PostgreSQL** on `localhost:5432`
- **Redis** (with AOF persistence enabled) on `localhost:6379`
- **Elasticsearch** on `localhost:9200`

### 2. How to Set Up Ethereal Email & Env Variables

#### Setting Up Environment Variables

Copy `.env.example` to `backend/.env` and `frontend/.env.local`:

```bash
# Copy backend environment configuration
cp .env.example backend/.env

# Copy frontend environment configuration
cp frontend/.env.example frontend/.env.local
```

#### Complete Environment Variable Configuration

##### Backend (`backend/.env`):

- `PORT`: `5000`
- `NODE_ENV`: `development`
- `FRONTEND_URL`: `http://localhost:3000`
- `DATABASE_URL`: `postgresql://...neon.tech/neondb?sslmode=require`
- `REDIS_HOST`: Upstash or local Redis host (e.g., `localhost`)
- `REDIS_PORT`: `6379`
- `REDIS_PASSWORD`: Password if using auth-protected Redis
- `ELASTICSEARCH_NODE`: `http://localhost:9200`
- `SESSION_SECRET` & `JWT_SECRET`: Authentication signing secrets
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `GOOGLE_CALLBACK_URL`: `http://localhost:5000/auth/google/callback`
- `SLACK_CLIENT_ID` & `SLACK_CLIENT_SECRET`: Slack OAuth app credentials
- `SLACK_REDIRECT_URI`: `http://localhost:5000/api/slack/callback`
- `WORKER_CONCURRENCY`: `5` (Concurrent jobs processed per worker)
- `DEFAULT_MIN_DELAY_BETWEEN_EMAILS_MS`: `2000` (Minimum delay between sends)
- `MAX_EMAILS_PER_HOUR_DEFAULT`: `200` (Hourly rate limit cap per sender)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: SMTP credentials (Gmail / Custom SMTP / Ethereal)
- `GMAIL_USER` & `GMAIL_APP_PASSWORD`: Gmail fallback sending credentials
- `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`: S3 Attachment Storage credentials

##### Frontend (`frontend/.env.local`):

- `NEXT_PUBLIC_MOCK_MODE`: `false` (Set to `false` to connect to real backend API on port 5000)
- `NEXT_PUBLIC_API_URL`: `http://localhost:5000`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth Client ID matching the backend

#### Setting Up Ethereal Email (Fake SMTP)

Ethereal Email provides fake SMTP credentials for safe testing without dispatching real emails.

Run the built-in seed script to generate an Ethereal SMTP account automatically and seed it into your database as the primary sender:

```bash
cd backend
npm run seed:ethereal
```

*This automatically contacts the Ethereal API, provisions host `smtp.ethereal.email`, port `587`, username, and password, and saves it into PostgreSQL as the active sender.*

### 3. How to Run Backend (API & Worker)

You can run the backend in **two modes**:

#### Option A: Combined Single-Process Mode (Recommended for Deployment / Render Free Tier)

Runs both the Express REST API server and the BullMQ Email Worker inside a **single unified process**:

```bash
cd backend
npm install
npm run build
npm run start:combined
```

- **Combined API + Worker Server**: Runs on `http://localhost:5000`
- **Bull Board Queue Dashboard**: Accessible live at `http://localhost:5000/admin/queues`

#### Option B: Process Separation Mode (For Horizontal Scaling / Development)

Runs the API server and BullMQ Worker in separate dedicated terminals:

```bash
cd backend
npm install

# Terminal 1: Run API Server (Express.js)
npm run dev:api

# Terminal 2: Run BullMQ Worker
npm run dev:worker
```

- **API Server**: Runs on `http://localhost:5000`
- **Bull Board Queue Dashboard**: Accessible live at `http://localhost:5000/admin/queues`

### 4. How to Run Frontend (Next.js Dashboard)

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

- **Frontend Dashboard**: Runs on `http://localhost:3000`

---

## 🏛 Architecture Overview

### How Scheduling Works

- When a user submits an email batch via the frontend dashboard or API (`POST /api/emails/schedule`), the backend creates `Email` records in PostgreSQL with status `SCHEDULED`.
- For each recipient, a delayed job is added directly to **BullMQ** with a `delay` calculated as `scheduledFor.getTime() - Date.now()`.
- **Zero Cron Jobs:** Job execution is purely event-driven using Redis delayed job queues.
- When the timer expires, BullMQ pushes the job to active workers for processing.

### How Persistence on Restart is Handled

- **Dual Layer Persistence:** All scheduled emails are stored in both PostgreSQL and Redis (with `--appendonly yes` AOF persistence).
- **Worker Reconciliation on Boot:** Whenever the worker process boots (`worker.ts`), `reconciliation.ts` queries PostgreSQL for any pending `SCHEDULED` emails whose execution time is still in the future or overdue.
- **Idempotency via Database UUIDs:** Every job is added to BullMQ using the database `email.id` as its unique `jobId`. If a job is already queued in Redis, BullMQ ignores the duplicate enqueue attempt (`no-op`).
- **Restart Survival:** If the worker or server crashes and restarts, future emails execute exactly on schedule without being duplicated or restarted from scratch.

### How Rate Limiting & Concurrency are Implemented

- **Worker Concurrency:** Configurable per worker instance (e.g. `WORKER_CONCURRENCY=5`). Multiple worker instances can run in parallel without race conditions.
- **Provider Throttling (Per-Email Delay):** The worker enforces a configurable minimum delay (e.g. 2000ms) between individual email dispatches to prevent provider flags.
- **Hourly Rate Limiting:** Enforced per sender using Redis sliding hour-window counters (`ratelimit:{senderId}:{YYYY-MM-DDTHH}`).
- **Rescheduling on Limit Hit:** When a sender's hourly limit is reached:
  - Jobs are **never dropped or failed**.
  - Remaining queued jobs are calculated against `msUntilNextHour` and delayed/rescheduled into the next hourly window while maintaining order.
- **Slack Notification on Limit Hit:** Upon reaching the hourly limit, a real OAuth-authenticated alert message is dispatched to the user's connected Slack channel via incoming webhooks (`SlackService.ts`).

---

## 📋 List of Features Implemented

### Backend Features

- **Job Scheduler**: Persistent scheduling using BullMQ delayed jobs backed by Redis (No cron jobs used).
- **Persistence & Idempotency**: PostgreSQL DB storage combined with Redis AOF persistence and database UUID deduplication (`jobId`) ensuring clean restart survival.
- **Rate Limiting**: Atomic Redis counter rate limiter per sender per hour (`MAX_EMAILS_PER_HOUR`), automatically pushing overflow jobs into the next hourly window.
- **Worker Concurrency & Throttling**: Configurable worker concurrency level with minimum inter-email delay (`DEFAULT_MIN_DELAY_BETWEEN_EMAILS_MS`).
- **Slack OAuth & Real-Time Alerts**: Complete OAuth integration storing tokens/webhooks per user; sends real Slack notifications when rate limits are triggered.
- **Elasticsearch Searchability**: Real-time indexing of all scheduled and sent emails into Elasticsearch 8.13 with multi-field search endpoints (`/api/search`).
- **Fake SMTP & Gmail/S3 Integration**: Automated seeding script (`seedEtherealSender.ts`) creating Ethereal accounts with preview URLs, optional Gmail SMTP fallback, and S3 attachment uploading via Neon DB S3.
- **BullBoard Dashboard**: Live real-time visibility into queue states mounted at `/admin/queues`.

### Frontend Features

- **Google OAuth Login**: Authentic Google OAuth 2.0 authentication flow displaying user avatar, name, email, and logout functionality.
- **Main Dashboard**: Clean layout with header, navigation, statistics, and tabbed view for scheduled vs. sent emails.
- **Compose & CSV Batch Scheduler**:
  - Subject & Rich Text Body composition.
  - CSV/text file upload with automatic email address parsing and recipient count detection.
  - Configurable start time, per-email delay, and hourly send limit settings.
- **Scheduled Emails Table**: Filterable list displaying email details, recipient count, target schedule time, and status.
- **Sent Emails Table**: Detailed list showing sent timestamp, status tag (`SENT` / `FAILED`), and direct link to view Ethereal HTML email previews.
- **Slack Integration UI**: Dedicated "Connect Slack" button handling OAuth connection state seamlessly.
- **Global Elasticsearch Search Box**: Live multi-field search input searching subject, body, and recipients in real-time.
- **UX States**: Comprehensive loading spinners, empty state illustrations, and toast alert notifications.
