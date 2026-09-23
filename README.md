# ReachInbox — Production-Grade Email Job Scheduler & Dashboard

Production-grade, horizontally scalable email scheduler service and web dashboard built for the **ReachInbox (Outbox Labs)** hiring assignment using **Node.js, Express, TypeScript, BullMQ, Redis, PostgreSQL (Prisma), Elasticsearch, Next.js, and Tailwind CSS**.

---

## 📑 Quick Navigation (Mapped to Submission Guidelines)

1. [📦 Repository & Access](#-repository--access)
2. [⚙️ How to Run Backend (Express, Redis, DB, BullMQ Worker)](#️-how-to-run-backend-express-redis-db-bullmq-worker)
3. [💻 How to Run Frontend](#-how-to-run-frontend)
4. [✉️ How to Set Up Ethereal Email and Env Variables](#️-how-to-set-up-ethereal-email-and-env-variables)
5. [🏛 Architecture Overview](#-architecture-overview)
   - [How Scheduling Works (Zero Cron Jobs)](#how-scheduling-works)
   - [How Persistence on Restart is Handled](#how-persistence-on-restart-is-handled)
   - [How Rate Limiting & Concurrency are Implemented](#how-rate-limiting--concurrency-are-implemented)
6. [📋 List of Features Implemented](#-list-of-features-implemented)
   - [Backend: Scheduler, Persistence, Rate Limiting, Concurrency](#backend-scheduler-persistence-rate-limiting-concurrency)
   - [Frontend: Login, Dashboard, Compose, Tables, etc.](#frontend-login-dashboard-compose-tables-etc)
7. [🎬 Demo Video Guide (Max 5 Minutes)](#-demo-video-guide-max-5-minutes)
   - [Show Creating Scheduled Emails](#1-show-creating-scheduled-emails-frontend-or-postman)
   - [Show the Dashboard with Scheduled and Sent Emails](#2-show-the-dashboard-with-scheduled-and-sent-emails)
   - [Show a Restart Scenario: Stop Server → Start Again → Future Emails Still Send](#3-show-a-restart-scenario-stop-server--start-again--future-emails-still-send)
   - [(Bonus) Demonstrate Rate Limiting / Delay Under Load](#4-bonus-demonstrate-how-rate-limiting--delay-behaves-under-load)
8. [⚖️ Assumptions, Shortcuts, or Trade-offs Made](#️-assumptions-shortcuts-or-trade-offs-made)

---

## 📦 Repository & Access

- **GitHub Repository**: Private repository
- **Collaborator Access Granted To**:
  - `Mitrajit`
  - `Yadav036`

---

## ⚙️ How to Run Backend (Express, Redis, DB, BullMQ Worker)

The backend consists of four core infrastructure components:
1. **Database**: PostgreSQL 16
2. **Message Broker / Cache**: Redis 7 (configured with `--appendonly yes` for durability)
3. **Search Engine**: Elasticsearch 8.13
4. **Node.js Processes**: Express API (`server.ts`) and BullMQ background worker (`worker.ts`)

### Step 1: Start Infrastructure Containers (Docker)
Ensure Docker Desktop is running, then execute from the project root:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL**: `localhost:5432` (db: `reachinbox`, user: `postgres`, pass: `postgres`)
- **Redis**: `localhost:6379` (with AOF disk persistence enabled)
- **Elasticsearch**: `localhost:9200` (single-node, cluster ready)

Verify all containers are healthy:
```bash
docker compose ps
```

### Step 2: Install Backend Dependencies & Apply Database Schema
```bash
cd backend
npm install

# Push Prisma schema to PostgreSQL
npx prisma db push

# Generate Prisma Client types
npx prisma generate
```

### Step 3: Run the Express API Server
```bash
# Inside backend/ directory
npm run dev:api
```
- API Server runs at: **`http://localhost:5000`**
- Real-time Bull Board Queue Dashboard: **`http://localhost:5000/admin/queues`**

### Step 4: Run the BullMQ Worker Process
Open a **new terminal tab** and run:
```bash
cd backend
npm run dev:worker
```
- The worker process runs boot reconciliation, acquires a Redis distributed lock, and begins listening to `email-queue`.
- **Horizontal Scaling**: You can open additional terminals and run `npm run dev:worker` to spawn concurrent worker replicas safely.

---

## 💻 How to Run Frontend

The frontend is a modern Next.js 16 application with React 19, Tailwind CSS, TipTap rich text editor, and Lucide icons.

### Step 1: Install Dependencies
Open a **new terminal tab**:
```bash
cd frontend
npm install
```

### Step 2: Configure Frontend Environment
Ensure `frontend/.env.local` contains:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Step 3: Start Development Server
```bash
npm run dev
```
- Open **`http://localhost:3000`** (or `http://localhost:5173` depending on port availability) in your browser.
- Log in with Google OAuth or using the local credential registration/login form.

---

## ✉️ How to Set Up Ethereal Email and Env Variables

### 1. Setting Up Ethereal Email (Automated 1-Click Seeder)
Ethereal is a safe, disposable fake SMTP service that captures all outbound emails and provides real web preview links (`https://ethereal.email/messages`).

To set up an Ethereal sender automatically:
```bash
cd backend
npm run seed:ethereal
```
**What this script does:**
1. Calls `nodemailer.createTestAccount()` to generate fresh SMTP credentials.
2. Automatically inserts an active `Sender` record into PostgreSQL with `hourlyLimit = 200` and `minDelayMs = 2000`.
3. Prints the credentials in your terminal:
   ```text
   Generated Ethereal Credentials:
   User: testuser@ethereal.email
   Pass: secret123
   SMTP Host: smtp.ethereal.email
   SMTP Port: 587
   ```
4. When any email is sent by the worker, `nodemailer.getTestMessageUrl(info)` is generated and saved as `Email.previewUrl`. In the frontend **Sent Emails** tab, clicking **"Preview Email"** opens the exact rendered email directly in your browser.

---

### 2. Environment Variables Configuration

Copy `.env.example` to `backend/.env`:
```bash
cp .env.example backend/.env
```

#### Backend Environment Variables (`backend/.env`):
| Variable | Description | Value / Default |
| :--- | :--- | :--- |
| `PORT` | Express API port | `5000` |
| `NODE_ENV` | Application environment | `development` |
| `FRONTEND_URL` | Frontend URL for CORS origin | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL Prisma connection string | `postgresql://postgres:postgres@localhost:5432/reachinbox?schema=public` |
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password (blank for local Docker) | `""` |
| `ELASTICSEARCH_NODE` | Elasticsearch node URL | `http://localhost:9200` |
| `SESSION_SECRET` | Session cookie encryption secret | `reachinbox_super_secret_session_key_12345` |
| `JWT_SECRET` | Secret key for JWT signing | `reachinbox_jwt_secret_key_67890` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your_google_client_id_here` (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your_google_client_secret_here` (optional) |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL | `http://localhost:5000/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack OAuth App Client ID | `your_slack_client_id_here` (optional) |
| `SLACK_CLIENT_SECRET` | Slack OAuth App Client Secret | `your_slack_client_secret_here` (optional) |
| `SLACK_REDIRECT_URI` | Slack OAuth redirect URL | `http://localhost:5000/api/slack/callback` |
| `WORKER_CONCURRENCY` | Number of simultaneous jobs per worker | `5` |
| `DEFAULT_MIN_DELAY_BETWEEN_EMAILS_MS` | Minimum throttle delay between sends | `2000` (2 seconds) |
| `MAX_EMAILS_PER_HOUR_DEFAULT` | Default hourly limit per sender | `200` |

#### Frontend Environment Variables (`frontend/.env.local`):
| Variable | Description | Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Express API Base URL | `http://localhost:5000` |

---

## 🏛 Architecture Overview

### How Scheduling Works
- **Strictly Zero Cron Jobs**: No OS-level cron (`crontab`), no `node-cron`, and no polling timer loops.
- When an outreach campaign is submitted:
  1. The API creates records in PostgreSQL with status `SCHEDULED` and target execution timestamps `scheduledFor`.
  2. For multi-recipient batches, dispatch times are staggered using the configured delay:
     $$\text{scheduledTimestamp} = \text{baseStartTime} + (i \times \text{delayBetweenEmailsMs})$$
  3. Jobs are immediately enqueued into BullMQ (`email-queue`) as **delayed jobs**:
     ```ts
     const delay = Math.max(0, scheduledTimestamp - Date.now());
     await emailQueue.add(
       'send-email',
       { emailId: email.id },
       {
         jobId: email.id, // Idempotent key
         delay,
         removeOnComplete: true,
         attempts: 3,
         backoff: { type: 'exponential', delay: 5000 },
       }
     );
     ```
  4. BullMQ stores delayed jobs in Redis sorted sets (`zset`) sorted by target epoch timestamp. Redis internals awaken and dispatch jobs to workers at the exact millisecond required without wasteful database polling.

---

### How Persistence on Restart is Handled
Guaranteed survival across process crashes and server restarts through a three-layer defense:

1. **Redis AOF Durability**: Redis runs with `--appendonly yes`, syncing every transaction to disk so pending delayed queues survive Redis restarts.
2. **PostgreSQL as Primary Source of Truth**: Every email record is permanently stored in PostgreSQL before being enqueued.
3. **Boot Reconciliation Mechanism (`backend/src/queues/reconciliation.ts`)**:
   - Every time the worker boots, `reconcilePendingEmails()` queries PostgreSQL for all pending `SCHEDULED` emails.
   - It re-adds them to BullMQ using the email's database UUID as the `jobId`.
   - **BullMQ Idempotency**: If the job already exists in Redis, BullMQ discards the add operation as a no-op, preventing duplicate sends.
   - **Distributed Mutex**: A 30-second Redis lock (`reconcile:lock`) ensures that when scaling horizontally with multiple worker replicas, only one instance runs reconciliation.
   - **Past-Due Catchup**: If the server was offline and rebooted past an email's scheduled time, `delay = Math.max(0, scheduledTime - now)` evaluates to `0`, ensuring missed emails dispatch immediately upon boot without getting lost.

---

### How Rate Limiting & Concurrency are Implemented

1. **Configurable Worker Concurrency**:
   - The BullMQ worker is instantiated with `concurrency: env.WORKER_CONCURRENCY` (default: `5`).
   - Multiple worker instances coordinate safely across machines via Redis.

2. **Provider Throttling (Inter-Email Minimum Delay)**:
   - To mimic real-world provider rate limits (e.g. Gmail/Outlook policies), the worker enforces a pause between sends:
     ```ts
     const minDelay = sender.minDelayMs || env.DEFAULT_MIN_DELAY_BETWEEN_EMAILS_MS; // 2000ms
     await new Promise((resolve) => setTimeout(resolve, minDelay));
     ```

3. **Multi-Sender Hourly Rate Limiting (`RateLimitService.ts`)**:
   - Hourly rolling counter keys in Redis: `ratelimit:{senderId}:{YYYY-MM-DDTHH}`.
   - Atomic checks:
     ```ts
     const count = await redis.incr(key);
     if (count === 1) await redis.expire(key, 3700);
     ```
   - **Zero Dropped Emails**: If `count > limit`, the counter is rolled back via `redis.decr(key)` and the email is **rescheduled to the next hour window**:
     $$\text{msUntilNextHour} = (3600000 - (\text{timestamp} \pmod{3600000})) + 1000$$
   - The job is re-enqueued into BullMQ with `delay: msUntilNextHour` under the same `jobId`. Order is preserved and zero jobs fail.

4. **Slack Alerting on Rate Limit Exceeded (`SlackService.ts`)**:
   - When a sender's hourly limit is breached, a live webhook notification is dispatched to their connected Slack channel.
   - Alerts are de-duplicated using Redis (`slack:alerted:{userId}:{senderId}:{hourPrefix}`) so users receive at most one alert per sender per hour.
   - If Slack is not connected or the webhook is revoked, the system logs the event and continues without crashing.

---

## 📋 List of Features Implemented

### Backend: Scheduler, Persistence, Rate Limiting, Concurrency
- [x] **BullMQ Delayed Queue Scheduler**: Zero cron jobs; schedules emails down to the millisecond using Redis sorted sets.
- [x] **Reconciliation on Boot**: Scans PostgreSQL on startup and reconciles delayed jobs idempotently using database UUIDs as `jobId`.
- [x] **Distributed Concurrency Lock**: Redis mutex (`reconcile:lock`) prevents race conditions during worker boot across multiple instances.
- [x] **Configurable Worker Concurrency**: Processes up to `WORKER_CONCURRENCY=5` jobs concurrently per worker instance.
- [x] **Inter-Email Delay / Throttle**: Minimum 2-second delay (`DEFAULT_MIN_DELAY_BETWEEN_EMAILS_MS=2000`) between dispatches.
- [x] **Atomic Multi-Sender Hourly Rate Limiter**: Atomic Redis `INCR` / `DECR` rolling hourly counters (`ratelimit:{senderId}:{YYYY-MM-DDTHH}`).
- [x] **Automatic Next-Hour Rescheduling**: Excess emails are delayed to the start of the next hour window rather than failed or dropped.
- [x] **Real Slack OAuth & Webhook Alerting**: Dispatches live messages to Slack upon limit hit, with 1-hour alert de-duplication.
- [x] **Elasticsearch Full-Text Indexing**: Real-time indexing of emails on schedule, send, and failure; search API with fuzzy multi-field matching (`/api/search`).
- [x] **Ethereal Fake SMTP Integration**: Automatically provisions credentials, sends test emails, and generates preview URLs (`Email.previewUrl`).
- [x] **Bull Board Admin Dashboard**: Live queue monitoring UI mounted at `/admin/queues`.
- [x] **Authentication**: Google OAuth 2.0 and local JWT/session auth.
- [x] **Storage Service**: Attachment uploads to S3-compatible object storage.

### Frontend: Login, Dashboard, Compose, Tables, etc.
- [x] **Google OAuth & Local Authentication**: Google login flow + clean email/password sign-in and registration pages.
- [x] **Top Header**: User avatar, display name, user email, and one-click Logout.
- [x] **Real-Time Badge Counters**: Live count badges for Scheduled and Sent emails with background polling.
- [x] **Scheduled Emails Table**: Clean table displaying recipient, subject, scheduled date/time, sender, and status with loading and empty states.
- [x] **Sent Emails Table**: Clean table displaying recipient, subject, sent date/time, status (`SENT` / `FAILED`), and **"Preview Email"** button linking to Ethereal.
- [x] **Email Detail View Modal**: Inspect headers, scheduled timestamp, sender metadata, rich body content, and attachment links.
- [x] **Compose Campaign**:
  - Single recipient input or bulk **CSV/text file upload**.
  - Lead parser that automatically calculates and displays the detected email count.
  - **TipTap Rich Text Editor**: Bold, italic, underline, strike-through, headings, and alignments.
  - Date and time picker for campaign start time.
  - Configurable inter-email delay and hourly limit selector.
- [x] **Slack Connect Integration Card**: Real-time connection status badge and connect/disconnect button.
- [x] **Search Bar**: Debounced full-text search integrated with the backend Elasticsearch endpoint.

---

## 🎬 Demo Video Guide (Max 5 Minutes)

Here is a recommended script for recording the 5-minute evaluation video:

| Timestamp | Section | Exact Flow to Demonstrate |
| :--- | :--- | :--- |
| **0:00 - 0:45** | **Architecture & Startup** | 1. Show Docker containers running via `docker compose ps` (PostgreSQL, Redis, Elasticsearch).<br>2. Show backend API running (`localhost:5000`) and worker running in a separate terminal (`npm run dev:worker`).<br>3. Open Bull Board at `http://localhost:5000/admin/queues` to show the empty/active queue. |
| **0:45 - 1:45** | **Login & Dashboard Overview** | 1. Open `http://localhost:3000` and log in via Google OAuth or local credentials.<br>2. Highlight the header showing user avatar, name, and email.<br>3. Point out the live badge counts on the **Scheduled Emails** and **Sent Emails** tabs. |
| **1:45 - 2:45** | **1. Show Creating Scheduled Emails (Frontend or Postman)** | 1. Click **"Compose New Email"**.<br>2. Upload a sample CSV file with 3-5 email leads (show detected lead count).<br>3. Use the TipTap rich editor to add formatting (bold, underline, styled body).<br>4. Set the scheduled start time to **1-2 minutes in the future** and delay between sends to **2 seconds**.<br>5. Click **Schedule** → Show rows immediately appear in the **Scheduled Emails** table with countdown times. |
| **2:45 - 3:45** | **2. Show a Restart Scenario: Stop Server → Start Again → Future Emails Still Send** | 1. While emails are waiting in **Scheduled** status, **kill the worker terminal** (`Ctrl + C`).<br>2. Point out that the emails are still pending and their execution time has not yet arrived.<br>3. **Start the worker again**: `npm run dev:worker`.<br>4. Highlight the worker boot log: `Reconciliation complete: re-enqueued/verified X scheduled emails`.<br>5. Wait for the scheduled time: watch the worker cleanly pick up the jobs at the exact right moment without duplicates. |
| **3:45 - 4:15** | **3. Show Dashboard with Scheduled and Sent Emails** | 1. Show the emails automatically transitioning from **Scheduled** to **Sent**.<br>2. Click on a sent email to open the **Email Detail View**.<br>3. Click **"Preview Email"** to open the live Ethereal inbox view displaying the sent message. |
| **4:15 - 5:00** | **4. (Bonus) Demonstrate How Rate Limiting / Delay Behaves Under Load** | 1. Show a sender configured with a small hourly limit (e.g. 2 emails/hr) or trigger a batch.<br>2. Show worker log: `Sender hit hourly limit (2/hr). Rescheduling email in Xs`.<br>3. Show that jobs are not dropped, but cleanly rescheduled to the next hour.<br>4. Show the real alert notification received in your **Slack workspace** channel. |

---

## ⚖️ Assumptions, Shortcuts, or Trade-offs Made

1. **BullMQ Delayed Jobs vs. Polling Cron**:
   - *Decision*: We completely avoided cron jobs. Delayed jobs use Redis sorted sets (`zset`) with internal timer events, providing sub-second execution accuracy without wasteful database polling loops.
2. **PostgreSQL as Primary Source of Truth + Startup Reconciliation**:
   - *Trade-off*: Although BullMQ stores delayed jobs in Redis, Redis memory can be volatile if evicted. Storing the schedule in PostgreSQL ensures zero data loss, while the startup reconciliation bridges any drift between PostgreSQL and Redis.
3. **Atomic Rate Limit Check & Rollback vs. Lua Script**:
   - *Decision*: `RateLimitService` uses atomic Redis `INCR` followed by `DECR` upon exceeding limits. While a custom Lua script could combine check-and-increment into a single round-trip, `INCR` + conditional `DECR` is clean, robust, and provides immediate rollback without blocking the Redis event loop.
4. **Slack Alert De-Duplication**:
   - *Decision*: If a sender schedules 1,000 emails and hits the hourly limit, firing 1,000 Slack webhook calls would cause rate-limiting on Slack's API. A Redis cache key (`slack:alerted:...`) restricts alerts to once per sender per hour.
5. **Elasticsearch Soft-Failure**:
   - *Decision*: If Elasticsearch is temporarily unreachable during an email dispatch, the worker catches the error and continues. Email delivery is never blocked by a transient search indexing failure.
6. **Ethereal Disposable Mailer vs. Paid SMTP**:
   - *Decision*: Using `nodemailer.createTestAccount()` allows reviewers to test real SMTP delivery, MIME rendering, and preview links immediately without needing proprietary credentials or domain verification.
