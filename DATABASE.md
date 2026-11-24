# Database

PostgreSQL (Supabase). All timestamps are `timestamptz` stored in **UTC**; the UI converts to the user's timezone (profile) or labels UTC in admin.

## Migrations (`supabase/migrations`)
| File | Contents |
|---|---|
| `…0100_foundation` | roles, permissions, role_permissions, profiles, user_roles, user_preferences, user_feature_access, user_consents, account_requests; `has_permission()`, `is_staff()`, `my_permissions()`; profile & role-change guards; role/permission seed |
| `…0200_content` | news_categories, brokers, broker_regulations (source URL mandatory), broker_reviews, broker_promotions, news_sources, news_articles (+ full-text `search`), news_tags, news_article_tags, news_source_runs, news_source_errors, editorial_revisions, banner_prompts, video_scripts, content_reports; publication guard & revision triggers; category seed |
| `…0300_member_ai_comm_admin` | ai_provider_settings, ai_templates, ai_generations, ai_usage_logs, user_collections, saved_content, collection_items, favourite_brokers, user_segments, notifications, user_notifications, notification_preferences, newsletter_subscribers, newsletter_campaigns, contact_messages, advertising_enquiries, admin_audit_logs (append-only), admin_notes, website_settings, homepage_sections, navigation_items, footer_sections, social_links, advertisements, advertisement_events, scheduled_jobs, job_execution_logs, feature_flags, media_library, system_error_logs, redirects, rate_limits; new-user bootstrap & auth sync triggers |
| `…0400_analytics` | analytics_sessions, analytics_events, visitor_presence, daily_user_activity, user_engagement_scores, daily_analytics_summary, content_analytics_summary, user_retention_cohorts, analytics_reports |
| `…0500_functions` | rate limiting, audit, bootstrap admin, analytics ingest/heartbeat/rollup/scores, admin read functions, leaderboards, segments, notification fan-out, job locks, scheduled publishing, retention purge, AI quota |
| `…0600_rls` | RLS enabled on **every** public table, 105 policies, guest preview views |
| `…0700_defaults_storage` | default settings, homepage, footer, social links, navigation, feature flags, jobs, segments, AI templates, storage buckets & policies |

65 tables · 50 functions · `supabase/seed.sql` = development sample data only.

## Access model
* **anon** — published news, active brokers, categories, public settings, homepage content, guest previews of prompts/scripts (`banner_prompts_preview`, `video_scripts_preview` — truncated).
* **authenticated member** — own profile (status, limits and verification are protected by trigger), own saved content, collections, favourites, AI generations, notifications, preferences, consents and requests. Full text of published member prompts/scripts.
* **staff** — per-permission policies (`has_permission('news.edit')`, …). Super Admin has all permissions. Analytics Viewer cannot read the profile directory or emails.
* **service role** (server only) — analytics ingestion, cron jobs, exports helpers. Never exposed to browsers.
* Private AI generations: readable **only by their owner** (no staff policy).
* Audit logs: insert through `log_admin_action()`, update/delete blocked by trigger.

## Key functions
| Function | Used by |
|---|---|
| `analytics_ingest(session, events)` | `/api/track` — idempotent by `event_id`, deduped by `dedupe_key` |
| `analytics_heartbeat(p)` | `/api/heartbeat` — presence (one row per person), capped engaged seconds |
| `analytics_rollup_day(day)`, `refresh_engagement_scores()` | jobs; aggregates for dashboards and rankings |
| `admin_overview_stats()` · `analytics_timeseries/breakdown/top_pages/heatmap/funnel/retention` · `compute_retention_cohorts` · `get_leaderboard` · `user_analytics_summary` · `content_performance` · `get_live_visitors` | admin pages (each checks permissions) |
| `segment_user_ids(rules)` · `deliver_notification(id)` | segments, notifications |
| `claim_due_sources` · `try_lock_job` · `release_job` · `publish_due_content` · `purge_analytics` | background jobs |
| `bootstrap_super_admin(email)` | first admin only |

## Indexes
Date-range and lookup indexes on events (`occurred_at`, `user_id+occurred_at`, `event_name+occurred_at`, `content_id+event_name`), sessions, presence, daily activity (`day, score`), news (`status, news_type, published_at`, category, broker, market, priority, GIN full-text), trigram search on profile name/email and broker name.

## Retention
`analytics.tracking.retention_days` (default 90): raw events and sessions older than this are deleted nightly (`analytics_purge`). Daily aggregates (`daily_*`, `content_analytics_summary`, cohorts) are kept.

## Types
Generate full TypeScript types after linking: `npm run db:types`. Hand-written row types live in `src/types/db.ts`.
