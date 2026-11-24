# Test Report

Run on 24 Nov 2026 (Linux, Node 22, PostgreSQL 16, Chrome headless). All results below were actually executed; nothing is extrapolated.

## Summary
| Suite | Command | Result |
|---|---|---|
| TypeScript (strict) | `npm run typecheck` | ✅ 0 errors |
| ESLint (next/core-web-vitals + typescript) | `npm run lint` | ✅ 0 errors, 0 warnings |
| Unit tests (Vitest) | `npm test` | ✅ 30/30 passed (4 files) |
| Database tests | `npm run test:db` | ✅ all 7 migrations + seed applied on a fresh PostgreSQL 16; 55 assertions passed |
| End-to-end (browser) | `npm run stack:local` + `npm run test:e2e` | ✅ 35/35 checks passed |
| Production build | `npm run build` | ✅ compiled, 90 routes |

## Unit tests (30)
Slug/time/duration helpers, open-redirect protection · CSV formula-injection neutralisation · SSRF private-range detection and URL rejection (http, credentials, ports, localhost, metadata IP) · prompt-injection delimiter stripping and strict system rules · analytics metadata privacy filter, path sanitisation, event whitelist, UA/traffic classification · RSS/Atom/JSON Feed parsing, entity-encoded HTML, future-date clamp, similar-headline detection · HOT classification never from promotional wording, high-risk routing, broker matching · video-script section parsing · CMS field validation (URL schemes, select options, required, UTC datetimes, tags) · date ranges · registration schema and password strength.

## Database tests (55 assertions, `tests/db/rls_and_analytics.sql`)
New-user trigger (profile, member role, consents, marketing opt-in only with consent) · auth→profile sync of verification/last login · one-time Super Admin bootstrap · **member isolation** (other profiles, saved content, favourites invisible; no analytics/audit access; drafts hidden) · members cannot change own status/AI limit · privilege escalation via `user_roles` blocked · member cannot call admin stats or the heartbeat function directly · cannot write another user's rows · content creator cannot publish · **anon** cannot read member-only prompt text, profiles or private settings but can read previews and public settings · analytics ingestion idempotency and copy de-duplication · **multi-tab presence = one row**, hidden tab adds no engaged time, engaged time capped · rollup counts and **engagement score formula (=13)**, rank and streak · admin overview, leaderboards, live visitors (email visible to Super Admin, hidden for Analytics Viewer), user summary, segments · admin cannot read private AI generations or other users' notifications · notification fan-out idempotent · audit logs immutable · scheduled publishing · rate limiter.

## End-to-end (35 checks, `tests/e2e/run.py`)
Real stack: PostgreSQL 16 + **Supabase Auth v2.180** + **PostgREST 12.2** behind a local gateway, app built in production mode.
Signup → dashboard; profile trigger; verification/login sync; member prompts with copy; save article; follow broker; AI studio “not configured” state; profile update; analytics events recorded; copy de-duplicated; one presence row; no IP column; **member gets 404 on /admin and on admin export**; Super Admin overview; **all 44 admin pages render without errors**; live visitors; user timeline; create + publish article through the CMS with tags and notification; article live; audit log; settings save; homepage section save; cron endpoint rejects missing secret and runs due jobs; rankings; CSV export (BOM, data); manual notification delivery; suspend user; **suspended user cannot log in**; no client-side runtime errors.

## Visual checks
Homepage screenshots at 1199×1312 compared side-by-side with the reference PNG (header, hero, social/Dott Plus cards, daily tools, gold news bar, today's panels, category cards, footer) and at 390px mobile width; article, sign-up, member dashboard, admin overview and user profile pages reviewed by screenshot. Layout closely follows the reference; it is not certified pixel-perfect across browsers.

## Bugs found and fixed during testing
* Auth→profile sync was blocked by the member column guard (verification and last login never updated) — fixed with a nested-trigger exception, covered by a DB test.
* Ambiguous embedded relation `profiles`↔`user_roles` broke the Users list — fixed.
* Optional selects with NOT NULL defaults failed on create (e.g. content origin) — defaults now applied server-side.
* Entity-encoded HTML in feeds leaked tags into summaries — decoder fixed.
* Meaningful events could be lost on fast navigation — now sent immediately (views stay batched).
* Banned users saw a generic login error — now told the account is suspended.

## Requires verification with external services (not testable here)
| Item | Why |
|---|---|
| Supabase **Realtime** live updates | Not available locally (page falls back to 15s polling, which was exercised) |
| Supabase **Storage** uploads (media, avatars) | Storage API not available locally; bucket policies are created by migration |
| Email: verification/reset templates, newsletter sending (Resend) | No SMTP/provider; Auth ran with autoconfirm |
| AI providers (Gemini/OpenAI/Anthropic/compatible) | No API keys; error/not-configured paths tested |
| Live RSS sources | Sandbox network restrictions; parser and SSRF guard unit-tested |
| TOTP MFA enrol/verify, Turnstile, OneSignal push | Need real devices/keys |
| Vercel Cron / pg_cron scheduling, Vercel deployment | Not deployed (endpoint auth and job runner tested) |
| Lighthouse performance & cross-browser (Safari/Firefox) | Not run |
