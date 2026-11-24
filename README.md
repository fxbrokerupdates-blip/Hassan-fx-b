# FX Broker Updates

**Your Trusted Source for Global Broker News** — www.fxbrokerupdates.com

A full-stack financial news and content-creation platform for Forex traders, Introducing Brokers, affiliates, broker employees and financial content creators. Built with **Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS 4 + Supabase (PostgreSQL, Auth, Storage, Realtime)**.

> FX Broker Updates is **not** a broker, trading platform or signal provider. There are no internal courses, signals, trade execution or deposits. **Dott Plus** is an external promotional link only.

## What's inside

| Area | Highlights |
|---|---|
| Public website | Homepage built to the approved reference design (editable from admin), Broker Updates, Trading Updates, All News (tabs, trending, featured, archives), article pages with source attribution, broker directory & profiles, free tools (banner prompts, video scripts), search, category archives, legal/static pages, 404, maintenance, PWA |
| Authentication | Registration (country code phone, country, profession, consent), email verification, login with remember-me, password reset, resend verification, rate limiting, bot-protection hooks (honeypot + optional Turnstile), suspension checks, optional TOTP MFA |
| Member dashboard | Home with personalised feeds, news, daily banner prompts, daily video scripts, **AI Creator Studio**, favourite brokers, saved content + collections, content history (edit/copy/download/delete), notification center, profile, settings (preferences, notifications, privacy, password, sessions, MFA, data export, deletion request), help |
| Admin panel | Overview KPIs & charts, **Live Visitors** (Realtime), website analytics (traffic, sources, devices, heatmap, funnels, retention cohorts), **user rankings** (15 leaderboards, configurable score), individual **user intelligence profile** with activity timeline & calendar, segments, CSV reports, user management, staff roles & permission matrix, news CMS with review workflow & revisions, broker directory/regulations/promotions/reviews, prompts, scripts, content performance, news sources & jobs, AI studio, AI settings, daily automation, homepage builder, ads, notifications, newsletter, inbox, global settings, feature flags, redirects, audit logs, system health, media library |
| Backend | 65 tables, 105 RLS policies (RLS enabled on every table), 50 SQL functions, permission-checked SQL functions, first-party analytics with aggregation tables, SSRF-safe news ingestion, provider-independent AI layer (Gemini / OpenAI / Anthropic / OpenAI-compatible), scheduled jobs with DB locks |

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

* **Without Supabase** the public site runs in *development mode* with clearly labelled **SAMPLE** content so the design can be reviewed. Accounts, dashboards and admin show a "Database not connected" page.
* **With Supabase** follow **[SETUP.md](SETUP.md)** (≈15 minutes): create the project, run the 7 migrations, set environment variables, register, promote yourself to Super Admin.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `npm run lint` | TypeScript strict · ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Applies all migrations + seed to a throwaway PostgreSQL and runs RLS/analytics tests |
| `npm run stack:local` then `npm run test:e2e` | Local Supabase-compatible stack (PostgreSQL + Supabase Auth + PostgREST) and browser end-to-end tests |
| `npm run admin:promote -- you@example.com` | Grants the first Super Admin |

## Project structure

```
src/app/(public)        public website        src/app/admin           admin panel
src/app/(auth)          login / signup        src/app/api             tracking, AI, cron, exports…
src/app/dashboard       member area           src/lib                 data, auth, analytics, ai, news, jobs, security
src/components          UI by area            supabase/migrations     schema, RLS, functions, defaults
tests/unit · tests/db · tests/e2e             public/                 brand assets, PWA, service worker
```

## Documentation

[SETUP](SETUP.md) · [DATABASE](DATABASE.md) · [ARCHITECTURE](ARCHITECTURE.md) · [ADMIN_GUIDE](ADMIN_GUIDE.md) · [ANALYTICS_GUIDE](ANALYTICS_GUIDE.md) · [SECURITY](SECURITY.md) · [DEPLOYMENT](DEPLOYMENT.md) · [ENVIRONMENT_VARIABLES](ENVIRONMENT_VARIABLES.md) · [TEST_REPORT](TEST_REPORT.md) · [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md)

## Before launch

1. Delete development sample rows (`is_sample = true`) — see SETUP.md §7.
2. Replace placeholder links (Dott Plus, social URLs) in **Admin → Homepage Builder** and **Social Links**.
3. Have the Privacy Policy, Terms and Disclaimer reviewed by a lawyer for your jurisdictions.
4. Add real, permitted news sources and an AI provider key.
