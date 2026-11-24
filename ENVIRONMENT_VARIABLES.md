# Environment Variables

Copy `.env.example` to `.env.local` for development. Set separately per environment in Vercel. Variables prefixed `NEXT_PUBLIC_` are visible in the browser — never put secrets there.

| Variable | Required | Scope | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | public | Canonical URL, e.g. `https://www.fxbrokerupdates.com` (used for sitemaps, auth redirects, emails) |
| `NEXT_PUBLIC_APP_ENV` | yes | public | `development` or `production`. Development enables labelled sample content when Supabase is absent, disallows indexing and never sends email |
| `NEXT_PUBLIC_SUPABASE_URL` | yes* | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes* | public | Supabase anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes* | **server secret** | Bypasses RLS — used only in server code for analytics ingestion, jobs, AI logging, admin user operations |
| `CRON_SECRET` | prod | **server secret** | ≥16 random chars; `Authorization: Bearer` for `/api/cron/*`; also salts rate-limit hashes |
| `GEMINI_API_KEY` | optional | **server secret** | Google Gemini |
| `OPENAI_API_KEY` | optional | **server secret** | OpenAI |
| `ANTHROPIC_API_KEY` | optional | **server secret** | Anthropic |
| `OPENAI_COMPATIBLE_API_KEY` / `OPENAI_COMPATIBLE_BASE_URL` | optional | **server secret** | Any OpenAI-compatible endpoint (base URL ending in `/v1`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | optional | public / secret | Cloudflare Turnstile bot protection on registration and contact |
| `EMAIL_PROVIDER` | optional | server | `resend` to enable newsletter sending |
| `RESEND_API_KEY` | optional | **server secret** | Resend API key |
| `EMAIL_FROM` | optional | server | Sender, e.g. `FX Broker Updates <news@fxbrokerupdates.com>` |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` / `ONESIGNAL_REST_API_KEY` | optional | public / secret | Web push (architecture prepared) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | optional | public | Search Console meta tag |

\* Without Supabase the public site runs in preview mode only.

Auth emails (verification, reset) are sent by **Supabase Auth** — configure SMTP in the Supabase dashboard, not here.
