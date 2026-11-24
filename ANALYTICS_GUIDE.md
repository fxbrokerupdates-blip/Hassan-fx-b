# Analytics Guide

First-party analytics, limited to activity **on FX Broker Updates**. No keylogging, screen recording, clipboard reading, form-value capture, fingerprinting or third-party ad trackers. Raw IP addresses are never stored (rate limiting uses a daily-rotating salted hash held only in memory/the rate-limit table).

## What is collected
| Field | Notes |
|---|---|
| event name | whitelist in `src/lib/analytics/events.ts` (40 events); anything else is rejected |
| user id | from the verified auth cookie (server-side); dropped if the member turned off personal analytics |
| session id | random per browsing session (30-min inactivity) |
| visitor id | anonymous random id **only after cookie consent** (when `anonymous_requires_consent` is on) |
| path | sanitized — query strings removed except `type/market/category/page` |
| content type/id, feature | e.g. `banner_prompt` + id |
| device / browser / OS | coarse, from the user agent |
| country | 2-letter code from the hosting edge header |
| referrer host, UTM | host only |
| metadata | ≤12 primitive values, email-like strings dropped |

## Events
Auth: registration_completed, email_verified, login_success, logout, session_start/end · News: news_list_view, article_open, article_engaged, article_progress (25/50/75/100), news_saved, news_shared, source_link_click, broker_view, broker_follow, broker_unfollow, report_submitted · Content: banner_prompt_view/copy/save, video_script_view/copy/save, ai_studio_open, ai_generation_requested/completed/failed, ai_output_copy/save/download, content_saved · Other: page_view, search (length only, never the query), filter_used, notification_open, external_link_click, dott_plus_click, facebook_click, linkedin_click, newsletter_signup, profile_updated, share_click, ad_click.

## Definitions (all values are estimates)
* **Heartbeat** — every 45s (15–120s configurable) while the tab is visible. Hidden tabs stop sending; a final beacon is sent on hide.
* **Engaged time** — seconds between heartbeats, counted only when the tab is visible, focused and had a pointer/scroll/key *interaction* (not keys themselves) within the idle window; server-capped at interval + 15s.
* **Active / Idle** — active if an interaction happened within `idle_seconds` (default 120s).
* **Online** — heartbeat within `offline_seconds` (default 150s).
* **Multiple tabs** — presence has **one row per person** (`u:<user>` or `a:<visitor>`), so tabs never double count; only the focused tab adds engaged time.
* **Session** — events sharing a session id; ends after 30 minutes without activity.
* **Meaningful active day** — ≥ `min_active_seconds` (60) engaged, or at least one article read, copy, AI generation or save.
* **Article read** — `article_engaged`: ≥15s visible and ≥50% scroll of the article body; counted once per article per day.
* **Bounce** — session with ≤1 page view and <10s engaged. **Engagement rate** — sessions with ≥2 page views or ≥10s engaged.
* **DAU/WAU/MAU** — distinct members with a meaningful active day today / last 7 / last 30 days.
* **Day-N retention** — members active exactly N days after registration ÷ members whose day N has passed.
* **Cohorts** — members grouped by registration week/month; % with any active day in each following period.
* **Unique visitors over a range** — sum of daily uniques (documented on the page).

## Engagement score
Computed daily from `daily_user_activity` (weights in **Settings → Analytics & Privacy**):

| Action | Points | Daily cap |
|---|---|---|
| Meaningful active day | 5 | 1 |
| Engaged minute | 1 | 60 |
| Article read | 2 | 25 |
| Unique banner prompt copied | 5 | 10 |
| Unique video script copied | 5 | 10 |
| Completed AI generation | 8 | 10 |
| Content saved | 3 | 10 |

Anti-abuse: idempotent event ids; server dedupe keys (copies within 10s, views within 30 min, article reads once per day); unique-item counting for copies; daily caps; AI rate limits and quotas; idle/hidden tabs earn nothing. Raw metrics are always shown next to the score.

## Aggregation
Dashboards read aggregate tables, refreshed by `analytics_rollup` (hourly; today) and `analytics_daily` (yesterday + cohorts). Admin pages call `ensure_today_rollup()` at most every 5 minutes. "Recalculate now" on Rankings forces it.

## Retention & privacy controls
* Raw events/sessions: deleted after `retention_days` (default 90). Aggregates kept.
* Anonymous visitors choose *Essential only* or *Accept analytics* (persistent visitor id only with consent).
* Members can disable personal activity analytics in **Settings → Privacy**; their events are then stored without a user id.
* Admin access: aggregate analytics (`analytics.view`), live (`analytics.live`), individual timelines (`analytics.users`), emails/phones (`users.pii`), exports (`analytics.export`/`users.export`, logged). Profile views are audit-logged. Private AI content is never shown in analytics.
