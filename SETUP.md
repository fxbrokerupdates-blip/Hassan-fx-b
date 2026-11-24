# Setup

## 1. Requirements
* Node.js **20.9+** and npm
* A Supabase project (free tier is fine) — or the Supabase CLI for local development
* Optional: PostgreSQL 15/16 locally to run `npm run test:db`

## 2. Install
```bash
npm install
cp .env.example .env.local
```

## 3. Create the Supabase project
1. Create a project at supabase.com (pick the region closest to your users).
2. **Project Settings → API**: copy *Project URL*, *anon public key* and *service_role key* into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Never expose the service role key.

## 4. Run the database migrations
Run the files in `supabase/migrations/` **in filename order**. Either:

* **Supabase CLI** (recommended)
  ```bash
  npx supabase login
  npx supabase link --project-ref <your-ref>
  npx supabase db push
  ```
* **SQL Editor**: paste and run each file in order (0100 → 0700).

They create all tables, RLS policies, functions, storage buckets (`media`, `avatars`), default settings, homepage content, categories, roles and permissions. No user accounts or credentials are created.

## 5. Configure Supabase Auth
**Authentication → URL Configuration**
* Site URL: `http://localhost:3000` (production: `https://www.fxbrokerupdates.com`)
* Redirect URLs: `http://localhost:3000/**`, `https://www.fxbrokerupdates.com/**`

**Authentication → Providers → Email**: enable *Confirm email* (required for email verification).

**Authentication → Email Templates** — use the token-hash links handled by `/auth/confirm`:
* *Confirm signup*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
* *Reset password*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
* *Change email*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/dashboard/profile`

For production, configure **custom SMTP** (Authentication → SMTP) — Supabase's built-in sender is heavily rate limited.

Optional: **Authentication → Multi-Factor** — enable TOTP to let members turn on two-factor authentication.

**Database → Replication (Realtime)**: the migration adds `visitor_presence` and `user_notifications` to the `supabase_realtime` publication. Confirm they are listed; Live Visitors falls back to 15-second polling if Realtime is unavailable.

## 6. Start and create the first Super Admin
```bash
npm run dev
```
1. Open `/signup` and register with your own email; verify it.
2. Promote yourself (only works while no Super Admin exists):
   ```bash
   npm run admin:promote -- you@example.com
   ```
   or in the SQL Editor: `select public.bootstrap_super_admin('you@example.com');`
3. Open `/admin`. Add other staff from **Users → (user) → Staff roles**.

## 7. Development sample data (optional)
`supabase/seed.sql` inserts fictional brokers and placeholder news/prompts/scripts flagged `is_sample = true` (shown with a **SAMPLE** badge, excluded from sitemaps and noindexed). Load it only in development:
```bash
psql "$DATABASE_URL" -f supabase/seed.sql      # or: npx supabase db reset (local)
```
Remove before launch:
```sql
delete from news_articles where is_sample; delete from banner_prompts where is_sample;
delete from video_scripts where is_sample; delete from brokers where is_sample;
delete from news_sources where feed_url = 'https://example.com/feed.xml';
```

## 8. Optional integrations
| Feature | What to set |
|---|---|
| AI Creator Studio | One of `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `OPENAI_COMPATIBLE_*`, then **Admin → AI Settings**: enable, choose provider + model |
| Scheduled jobs | `CRON_SECRET` + a scheduler (see DEPLOYMENT.md) |
| Bot protection | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Newsletter email | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` (never sends in development mode) |
| Web push | `NEXT_PUBLIC_ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` (architecture prepared) |
| Search Console | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` |

## 9. Local Supabase alternative
With Docker: `npx supabase start` uses `supabase/config.toml`, applies migrations and the seed. Without Docker (Linux + PostgreSQL installed): `npm run stack:local` starts PostgreSQL + Supabase Auth + PostgREST for testing (no Storage/Realtime).

## 10. Verify
```bash
npm run typecheck && npm run lint && npm test && npm run build
npm run test:db          # needs local PostgreSQL binaries
```
