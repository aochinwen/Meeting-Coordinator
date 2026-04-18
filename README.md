# Meeting Coordinator — The Organizer

A premium internal meeting coordination platform built with **Next.js 16**, **Supabase**, and deployed on **Vercel**.

---

## 🚀 Live Environments

| Environment | Branch | URL |
|---|---|---|
| **Production** | `main` | Assigned by Vercel after first deploy |
| **Staging** | `staging` | Auto-generated preview URL per push |
| **Feature Preview** | any other branch | Auto-generated preview URL per PR |

---

## 🛠 Local Development

### Prerequisites
- Node.js 20+
- A Supabase project (free tier works)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/aochinwen/Meeting-Coordinator.git
cd Meeting-Coordinator

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## ☁️ Deployment (Vercel)

### First-time setup

1. Go to [vercel.com/new](https://vercel.com/new) and import `aochinwen/Meeting-Coordinator`
2. Vercel auto-detects Next.js — no build settings needed
3. Add environment variables (Settings → Environment Variables):

| Variable | Environment |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview + Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview + Development |

> **Staging tip**: Use the same Supabase project for staging, or create a second free Supabase project and set its keys only on the `staging` branch in Vercel's preview environment settings.

4. Deploy. Every push to `main` deploys production. Every push to `staging` or any branch creates an isolated preview URL.

### Branch Strategy

```
main      → Production (https://your-app.vercel.app)
staging   → Staging    (https://your-app-git-staging-username.vercel.app)
feature/* → Preview    (ephemeral URL per PR)
```

---

## 🔒 Supabase RLS

Before going to production, enable Row Level Security on all tables.
See [`supabase/README.md`](./supabase/README.md) for detailed RLS policies.

**Quick check**: In Supabase Dashboard → Table Editor → each table → RLS should show a shield icon (🛡) not an open lock.

---

## 🧪 Testing

```bash
npm run test           # Run unit tests
npm run test:ui        # Visual test runner
npm run test:coverage  # Coverage report
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase SSR (`@supabase/ssr`) |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel (Singapore region) |
| Fonts | Literata (headings) · Nunito Sans (body) |
