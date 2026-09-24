# 🏛 Workflow & Architecture Guide — ReachInbox Scheduler

This document details the architectural design, Mermaid workflow diagrams, execution modes, and deployment strategies for the **ReachInbox Full-Stack Email Job Scheduler**.

---

## 📐 High-Level System Architecture

```mermaid
graph TD
    %% Frontend
    subgraph Frontend["Frontend Client Layer"]
        FE["Next.js 16 App Router<br/>(Vercel Deployment)"]
    end

    %% Backend Service
    subgraph BackendService["Backend Server Layer (Combined Mode)"]
        API["Express.js REST API<br/>(Render Web Service)"]
        WRK["BullMQ Email Worker<br/>(Nodemailer Engine)"]
        DASH["Bull Board Dashboard<br/>(/admin/queues)"]
    end

    %% Infrastructure & Data Stores
    subgraph Storage["Cloud Data Stores"]
        PG[("Neon PostgreSQL<br/>(Emails, Senders, Auth)")]
        REDIS[("Upstash Redis AOF<br/>(BullMQ Queue & Limits)")]
        ES[("Elasticsearch 8.13<br/>(Full-Text Indexing)")]
    end

    %% External Services
    subgraph External["External Gateways"]
        SMTP["SMTP Providers<br/>(Ethereal / Gmail / Custom)"]
        SLACK["Slack API<br/>(Rate Limit Webhooks)"]
    end

    %% Connections
    FE -->|HTTPS / REST API| API
    API -->|Prisma ORM| PG
    API -->|Delayed Enqueue| REDIS
    API -->|Search Queries| ES
    DASH -->|Queue Stats| REDIS

    WRK -->|Consume Jobs| REDIS
    WRK -->|Status Updates| PG
    WRK -->|Index Emails| ES
    WRK -->|Dispatch Mail| SMTP
    WRK -->|Trigger Alerts| SLACK
```

---

## ⚡ Combined API + Worker Entry Point (`server-with-worker.ts`)

### Why Combined Mode?
Standard production architectures run the REST API and the BullMQ Background Worker as separate microservices. However, cloud platforms like **Render** charge extra for dedicated "Background Worker" instances.

To enable **100% free-tier cloud deployment**, we implemented `backend/src/server-with-worker.ts`, a combined entry point that initializes both services within a single Node.js event loop process.

```mermaid
sequenceDiagram
    autonumber
    participant Boot as server-with-worker.ts
    participant ES as Elasticsearch
    participant DB as Neon PostgreSQL
    participant Redis as Redis (BullMQ)
    participant Express as Express HTTP Server

    Boot->>ES: 1. Ensure 'emails' index mapping exists
    Boot->>DB: 2. Run Reconciliation (Fetch pending SCHEDULED emails)
    DB-->>Boot: Return scheduled email records
    Boot->>Redis: 3. Idempotently re-enqueue overdue/pending jobs (jobId = email.id)
    Boot->>Redis: 4. Instantiate createEmailWorker() concurrency listeners
    Boot->>Express: 5. Mount REST routes, Auth & Bull Board (/admin/queues)
    Express-->>Boot: 6. Server listening on PORT 5000 [production]
```

---

## 🔄 Email Scheduling & Worker Lifecycle Workflow

```mermaid
flowchart TD
    Start(["User Schedules Email Batch"]) --> Submit["POST /api/emails/schedule"]
    Submit --> SaveDB["Create Email Record in PostgreSQL<br/>(status = SCHEDULED)"]
    SaveDB --> ComputeDelay["Compute Delay = scheduledFor - Date.now()"]
    ComputeDelay --> Enqueue["Enqueue to BullMQ Queue<br/>(jobId = email.id)"]

    Enqueue --> DelayWait["BullMQ Delay Wait in Redis"]
    DelayWait --> Expire["Timer Expires: Move to Active Queue"]
    Expire --> WorkerPick["Worker Picks Up Job"]

    WorkerPick --> CheckLimit{"Check Sender Hourly Quota<br/>(RateLimitService)"}
    
    CheckLimit -- "Quota Exceeded" --> Reschedule["Reschedule Job to msUntilNextHour<br/>(Keep same jobId)"]
    Reschedule --> NotifySlack["Send Real-Time Alert to Slack Webhook"]

    CheckLimit -- "Quota OK" --> CheckThrottle["Enforce Minimum Delay<br/>(minDelayMs e.g. 2000ms)"]
    CheckThrottle --> Dispatch["Send via Nodemailer SMTP<br/>(sendEmailViaSMTP)"]

    Dispatch --> SMTPResult{"SMTP Result"}

    SMTPResult -- "Success" --> MarkSent["Update DB status = SENT<br/>Save Preview URL"]
    MarkSent --> IndexES["Index in Elasticsearch"]
    IndexES --> Complete(["Job Completed ✅"])

    SMTPResult -- "Timeout / Error" --> RetryCheck{"Attempts < Max Retries (3)?"}
    RetryCheck -- "Yes" --> Reattempt["BullMQ Retries Job with Backoff"]
    RetryCheck -- "No" --> MarkFailed["Update DB status = FAILED<br/>Save Error Message"]
    MarkFailed --> CompleteFailed(["Job Failed ❌"])
```

---

## 🛡 Restart & Failover Guarantees

1. **Redis AOF Persistence:**
   Redis is configured with `--appendonly yes`, ensuring queued jobs survive Redis container or server restarts.
2. **PostgreSQL Reconciliation Engine:**
   If Redis data is lost, `reconciliation.ts` queries PostgreSQL on boot for `SCHEDULED` emails and re-enqueues them automatically.
3. **Idempotent Job IDs:**
   Every job is tagged with `jobId: email.id`. If a job is already queued in BullMQ, enqueue attempts are ignored (`no-op`), guaranteeing **zero duplicate sends**.
4. **Rate Limit Overflow Rescheduling:**
   When a sender hits their hourly quota, jobs are not failed; they are cleanly delayed to `msUntilNextHour` and a Slack alert is sent.

---

## 🚀 Free Deployment Setup Summary

| Component | Platform | Service Type | Command |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | Next.js Project | `npm run build` |
| **Backend (API + Worker)** | **Render** | Web Service (Free) | `npm run start:combined` |
| **Database** | **Neon** | PostgreSQL 16 | Automatic cloud connection |
| **Queue Store** | **Upstash** | Redis (Cloud) | Automatic TLS connection |
