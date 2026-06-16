# Fusion WBS Tracker

Personal work breakdown structure tracker for Fusion Health L&D projects. Built with Next.js 14, Vercel Postgres, and Tailwind CSS.

## Features

- **Tasks view** — sortable/filterable table grouped by lane and workstream; click any row to edit status, finish date, and notes
- **Weekly burndown** — capacity chart showing Available vs. Total Planned hours; click a week to see active tasks
- **Briefing generator** — one-click L&D Goals Tracker status update via Claude (Anthropic API)

---

## ⚠️ Security Notice

**This app has no authentication.** It operates as share-via-URL only. Before sharing the URL with anyone beyond yourself, add a shared-password gate — for example, Next.js middleware-based Basic Auth or a simple password cookie — to prevent public access to your work data.

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
