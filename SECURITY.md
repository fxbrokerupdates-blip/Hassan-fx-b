# Security

## Implemented controls
| Area | Control |
|---|---|
| Authorization | Supabase **RLS on every table** (105 policies); server-side checks in every admin page/action (`requirePermission`, `assertPermission`); non-staff receive 404 on `/admin/*`; admin SQL functions call `assert_permission()` |
| Privilege escalation | Members cannot change their own status, AI limit, email or verification (trigger); only Super Admin can grant Administrator/Super Admin; you cannot remove your own Super Admin role; first admin only via `bootstrap_super_admin` (service role/SQL) — **no default credentials** |
| IDOR | Every member query filters by the verified user id and RLS enforces ownership (tested: cross-user reads/writes blocked) |
| Secrets | Service role key, AI keys, cron secret only in server env (`server-only` imports); keys displayed masked; never logged |
| Sessions | Supabase Auth (bcrypt, refresh rotation), JWT verified via `getClaims`, proxy refresh, “remember me” session cookies, sign-out POST + same-origin, sign out other sessions, banned users blocked at Auth level, optional TOTP MFA |
| Rate limiting | DB-backed fixed windows: signup 5/h/IP, login 20/15min/IP + 8/15min/email, reset & resend, contact, newsletter, AI per user/minute + daily quotas, exports, reports; in-memory limits for tracking/heartbeats |
| Bot protection | Honeypot fields; optional Cloudflare Turnstile verification |
| Input validation | zod schemas on all APIs/actions; generic CMS field validation (types, options, lengths, URL schemes, JSON); DB CHECK constraints |
| XSS | React escaping; no raw HTML rendering of user/editor content (safe mini-markdown renderer); JSON-LD escaped; `javascript:` URLs rejected |
| CSRF | Server Actions (origin-checked by Next.js); JSON APIs reject cross-site `Origin`; logout POST only |
| SQL injection | Parameterized PostgREST/RPC; dynamic SQL in functions uses `format(%I)` with whitelisted identifiers |
| SSRF | News fetcher: https only, no credentials/ports, DNS resolution with private/reserved range blocking (IPv4/IPv6), manual re-validated redirects, timeouts, 2 MB cap |
| Uploads | Images only (PNG/JPG/WebP/GIF), size limits (5 MB media, 2 MB avatars), random names, bucket policies (staff for media, own folder for avatars) |
| Prompt injection | Untrusted news wrapped in delimiters (stripped from input), explicit rules that source text is data, user instructions cannot override rules |
| Exports | Permission checks, PII gated, every export logged, spreadsheet formula injection neutralised |
| Audit | Append-only `admin_audit_logs` (update/delete blocked), sensitive keys redacted |
| Headers | HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy; `noindex` + `no-store` for admin/dashboard |
| Open redirects | `next` parameters restricted to same-site paths |
| PWA | Service worker never caches `/api`, `/dashboard`, `/admin`, `/auth` |
| Privacy | No IPs stored, consent banner, member opt-out, retention purge, data export & deletion requests |

## Verified by tests
See TEST_REPORT.md — member isolation, anon restrictions, publish permission, privilege escalation attempts, audit immutability, PII hiding for analytics viewers, cron auth, admin 404 for members, export permission, suspended login.

## Before production
- [ ] Rotate keys if ever shared; set a long random `CRON_SECRET`
- [ ] Custom SMTP; enable email confirmations; review Auth rate limits in Supabase
- [ ] Enable Turnstile on signup/contact
- [ ] Add a Content-Security-Policy suited to your final third-party scripts (Turnstile, OneSignal, analytics)
- [ ] Enable Supabase Point-in-Time Recovery / backups; run Supabase **Advisors** (security & performance)
- [ ] Error monitoring (e.g. Sentry) — `system_error_logs` covers jobs only
- [ ] Legal review of privacy policy and consent texts for your target regions

## Known limitations
* Rate limits for `/api/track` and `/api/heartbeat` are per serverless instance (memory) to keep them fast.
* Admins with `users.view` can read full profile rows via the API; email/phone are hidden in the UI without `users.pii`, but column-level masking is not enforced by RLS.
* The two guest preview views intentionally bypass RLS to show truncated text.

Report vulnerabilities to the site owner privately; do not open public issues.
