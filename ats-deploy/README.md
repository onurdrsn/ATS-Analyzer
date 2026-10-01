# ATS Analyzer — Deployment & Self-Hosting

This repository contains the deployment manifests, orchestration scripts, and environment templates for running the Open-Source ATS Resume & Job-Match Analyzer.

## Privacy Guarantee
**In self-hosted mode, 100% of resume, job posting, and analysis data remains strictly on your local machine or infrastructure.** No data is transmitted to Neon, Cloudflare, or any external analytics service.

---

## 1. Quick Start: Docker Compose (Recommended)

Self-host the complete stack (ATS API, Frontend, Job Fetcher, and local PostgreSQL container) with one command:

```bash
# 1. Clone this repository
git clone https://github.com/your-org/ats-deploy.git
cd ats-deploy

# 2. Copy the environment template
cp .env.example .env

# 3. Edit .env with your secrets (JWT secrets, etc.)
# 4. Start the stack
make docker-up
```

The stack exposes:
- **Web UI**: `http://localhost:5173`
- **API**: `http://localhost:3000`
- **Postgres**: `localhost:5432` (internal Docker network: `postgres:5432`)

---

## 2. Direct / Bare-Metal Run

To run without Docker:
1. Ensure a PostgreSQL instance (v15+) is running locally.
2. In `ats-api`:
   ```bash
   cp ../ats-deploy/.env.example .env
   npm install
   npm run db:migrate
   npm run dev
   ```
3. In `ats-job-fetcher`:
   ```bash
   npm install
   npm run dev
   ```
4. In `ats-web`:
   ```bash
   npm install
   npm run dev
   ```

---

## 3. Reverse Proxy & TLS (Production Self-Hosting)

Never expose the plain HTTP endpoints to the public internet. Use a reverse proxy like Caddy to terminate TLS:

```caddy
your-domain.com {
    reverse_proxy /api/* localhost:3000
    reverse_proxy localhost:5173
}
```

---

## 4. Backups

Since self-hosted deployments run a local `postgres:16-alpine` container, set up a daily `pg_dump` cron job:

```bash
0 2 * * * docker exec -t ats-deploy-postgres-1 pg_dump -U ats_user ats_db | gzip > /backups/ats_db_$(date +\%Y\%m\%d).sql.gz
```
