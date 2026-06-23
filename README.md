# Fusion WBS Tracker

Personal work breakdown structure tracker for Fusion Health L&D projects. Built with Next.js 14, Vercel Postgres, and Tailwind CSS.

## Features

- **Tasks view** — sortable/filterable table grouped by lane and workstream; click any row to edit status, finish date, and notes
- **Weekly burndown** — capacity chart showing Available vs. Total Planned hours; click a week to see active tasks
- **Briefing generator** — one-click L&D Goals Tracker status update via Claude (Anthropic API)

---

## Authentication

The app now requires a login. Access is gated by `proxy.ts` (Next.js 16's renamed middleware), and individual user accounts are stored in the `users` table. Passwords are hashed with scrypt; sessions are stateless HMAC-signed cookies. No external IdP/IT involvement required.

**Roles:** `Admin` (manage users), `Owner`, `Contributor`, `Viewer`.

### First-time setup — bootstrap the admin

On an empty `users` table, the app creates the first admin from environment variables. Add these to `.env.local`, then start the app and sign in:

```
AUTH_SECRET=<a long random string — e.g. `openssl rand -base64 32`>
ADMIN_EMAIL=allen.jones@fusionehr.com
ADMIN_PASSWORD=<a temporary password you choose>
```

Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`; you'll be prompted to set a new password on first login. After that you can remove `ADMIN_PASSWORD` from the env. Invite teammates from **Users** in the nav (admin only) — each gets a temp password they must reset on first sign-in.

> Set `AUTH_SECRET` to a stable random value in any real deployment. If it's missing the app falls back to a value derived from `POSTGRES_URL` (works, but rotating the DB URL invalidates all sessions).

---

## Setup

### Prerequisites

- Node.js 18+
- A Vercel account (for Postgres and deployment)
- An Anthropic API key

### Local development

```bash
git clone <repo-url>
cd Allen1
npm install

# Copy env template and fill in values
cp .env.local.example .env.local
# Edit .env.local with your credentials

npm run dev
```

The app auto-seeds the database from `seed-data/Allen_Jones_WBS_2026.xlsx` on first run. No manual seeding step needed.

### Environment variables

| Variable | Where to get it |
|---|---|
| `POSTGRES_URL` | Vercel dashboard → Storage → your Postgres database → `.env.local` tab |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys → Create new key |
| `AUTH_SECRET` | Any long random string — `openssl rand -base64 32`. Signs session cookies. |
| `ADMIN_EMAIL` | Email for the bootstrap admin account (first run only). |
| `ADMIN_PASSWORD` | Temporary password for the bootstrap admin (first run only; remove after). |

> **Note on Anthropic API key:** Your Claude Code CLI session (Fusion-paid) does **not** automatically share credentials with this web app. You must create a separate API key in the Anthropic console tied to your Fusion account, then add it to both `.env.local` (for local dev) and Vercel's environment variable settings (for production).

### Deployment

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel --prod
```

Add `POSTGRES_URL` and `ANTHROPIC_API_KEY` to your Vercel project environment variables in the dashboard before deploying, or via:

```bash
vercel env add ANTHROPIC_API_KEY
```
