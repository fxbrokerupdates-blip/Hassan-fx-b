# Deployment

Not deployed yet. Planned order: GitHub → Supabase → Vercel → domain → scheduler → Search Console.

## 1. GitHub
```bash
git init && git add . && git commit -m "FX Broker Updates initial import"
git branch -M main && git remote add origin git@github.com:<you>/fx-broker-updates.git && git push -u origin main
```
`.env*`, `.stack/`, `node_modules`, `.next` are git-ignored. Never commit keys.

## 2. Supabase (production project)
Follow SETUP.md §3–6. Use a **separate project** for development/staging. Do not load `seed.sql` in production.

## 3. Vercel
1. Import the GitHub repo (framework preset: Next.js, Node 20+).
2. Environment variables (Production and Preview separately) — see ENVIRONMENT_VARIABLES.md. Set `NEXT_PUBLIC_APP_ENV=production` and `NEXT_PUBLIC_SITE_URL=https://www.fxbrokerupdates.com` for production.
3. Deploy. Check `/admin/health` afterwards.

## 4. Domain
Vercel → Project → Domains → add `www.fxbrokerupdates.com` and `fxbrokerupdates.com` (redirect apex → www). Update Supabase Auth Site URL and Redirect URLs to the production domain.

## 5. Scheduler (news refresh every 2–5 minutes)
All jobs authenticate with `Authorization: Bearer $CRON_SECRET`. Endpoints:

| Endpoint | Runs |
|---|---|
| `/api/cron/run` | every job whose `next_run_at` has passed (recommended — call every 2–5 min) |
| `/api/cron/news-refresh` | news collection + scheduled publishing |
| `/api/cron/analytics-rollup` | today's + yesterday's aggregates, cohorts |
| `/api/cron/maintenance` | presence cleanup, scheduled notifications, retention purge, daily content automation |

`vercel.json` defines daily Vercel Cron entries compatible with the Hobby plan. Configure a separate scheduler for frequent news refresh. **Vercel Hobby only allows daily crons**; for 2–5 minute refresh use Vercel Pro, or Supabase **pg_cron + pg_net** (free):

```sql
create extension if not exists pg_cron; create extension if not exists pg_net;
select cron.schedule('fxbu-run-due-jobs', '*/3 * * * *', $$
  select net.http_get(
    url := 'https://www.fxbrokerupdates.com/api/cron/run',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
    timeout_milliseconds := 60000);
$$);
```
(Store the secret in Supabase Vault in production.) Job intervals are then controlled from **Admin → Jobs & Refresh**. GitHub Actions on a `*/5` schedule calling the same URL is another option.

## 6. Post-deploy checklist
- [ ] Register, verify email, `npm run admin:promote -- you@…` (run locally with production env) or SQL `bootstrap_super_admin`
- [ ] Admin → Global Settings: brand, contact email, domain, legal texts
- [ ] Homepage Builder: real Facebook/LinkedIn/Dott Plus links; Social Links
- [ ] AI Settings: provider + model, limits; test a generation
- [ ] News Sources: add permitted feeds, run each once, then enable
- [ ] System Health all green/expected; Jobs running on schedule
- [ ] Search Console: set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, submit `/sitemap.xml` and `/news-sitemap.xml`
- [ ] Lighthouse / mobile check on the live domain
