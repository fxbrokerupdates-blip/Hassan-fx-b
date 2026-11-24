# Architecture

```
Browser ──► Next.js 16 (Vercel)
             ├─ proxy.ts            session refresh, /dashboard & /admin gate, redirects table
             ├─ Server Components   public pages (ISR where possible), member & admin pages (per request)
             ├─ Server Actions      auth, member settings, admin CMS (zod/field validation + audit)
             ├─ Route handlers      /api/track · /api/heartbeat · /api/ai/* · /api/cron/* · /api/admin/export · forms
             └─ lib/                data · auth · analytics · ai · news · jobs · security · admin
                    │
                    ▼
            Supabase: PostgreSQL (RLS everywhere) · Auth · Storage · Realtime
```

## Rendering
* **Public pages** use a cookie-less anon client so they stay cacheable (`revalidate` 60–300s). The header loads the viewer client-side from `/api/me`.
* **Member & admin** layouts are `force-dynamic`, use the cookie-bound client, and re-check permissions (`requireUser`, `requirePermission`). Non-staff get a 404 for any `/admin` URL.
* Settings, homepage sections, navigation, footer, social links, categories and feature flags are loaded once per request (`getSiteConfig`) and fall back to built-in defaults (`src/lib/defaults.ts`).
* Theme colours are injected as CSS variables from `site.theme`, so the brand can be recoloured from admin.

## Design system
`src/app/globals.css` holds tokens (navy/gold palette, fonts Montserrat/Barlow/Barlow Semi Condensed via `@fontsource`) and component classes (`btn-gold`, `card-navy`, `input`, badges…). The homepage (`components/home/sections.tsx`) reproduces the reference design with real HTML; artwork is separate optimized assets in `public/images`.

## Analytics pipeline
```
tracker.tsx ── page_view / feature events ──► /api/track ──► analytics_ingest() ──► analytics_events, analytics_sessions
            └─ heartbeat (visible tabs) ─────► /api/heartbeat ► analytics_heartbeat() ► visitor_presence, daily_user_activity
jobs: analytics_rollup (hourly) / analytics_daily ► daily_user_activity counts + scores, daily_analytics_summary,
      content_analytics_summary, user_engagement_scores, retention cohorts
admin pages ◄── permission-checked SQL functions (aggregates, never millions of raw rows in the browser)
```
User identity for events comes from the verified auth cookie on the server, never from the client.

## News pipeline
`news_refresh` job → `claim_due_sources()` (row lock, skip locked) → `safeFetch()` (https only, DNS-checked, redirects re-validated, size/time limits, ETag) → parse RSS/Atom/JSON Feed → normalize (strip HTML, canonical URL, dates) → duplicate detection (URL hash + title similarity across sources, 3 days) → classification (market, broker match, HOT/WARM/NORMAL, high-risk wording) → **publish** only if source is trusted + auto-publish + not high-risk, otherwise **pending_review** → stats, backoff, run log. Only headline, ≤300-char excerpt and the source link are stored.

## AI layer
`lib/ai/catalog.ts` (content types/providers) → `prompt-builder.ts` (system rules + untrusted source wrapped in `<source_material>`, delimiters stripped from input) → `providers.ts` (fetch adapters for Gemini, OpenAI, Anthropic, OpenAI-compatible; keys server-side) → `service.ts` (settings, feature flags, per-user/global quotas, timeout, fallback provider, usage + cost log, stored generation). Admin chooses provider/model in the database — no code changes.

## Jobs
`scheduled_jobs` table + `runJob()` with `try_lock_job()` (no overlaps across instances) and `job_execution_logs`. Triggered by a scheduler calling `/api/cron/run` (all due jobs) or the specific endpoints, authenticated with `CRON_SECRET`. Jobs: news_refresh, publish_scheduled, presence_prune, notifications_dispatch, analytics_rollup, analytics_daily, analytics_purge, daily_content.

## Admin CMS
`lib/admin/resources.ts` declares 25 resources (fields, list columns, filters, bulk actions). Generic list/edit pages (`/admin/r/[resource]`) + server actions validate every field server-side, write through RLS, record audit entries and revalidate the site. Custom pages cover analytics, users, settings (structured JSON editor), homepage builder, AI, jobs, notifications, health.

## PWA
`app/manifest.ts`, `public/sw.js` (static assets cache, network-first navigations with `offline.html`; `/api`, `/dashboard`, `/admin`, `/auth` are never cached), push handlers ready for OneSignal/VAPID.
