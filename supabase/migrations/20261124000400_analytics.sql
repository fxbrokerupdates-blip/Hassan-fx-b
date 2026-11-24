-- =====================================================================
-- 0004 First-party analytics: sessions, events, presence, aggregates
-- Writes happen only through server APIs using the service role.
-- No IP addresses, keystrokes, clipboard contents or form inputs are stored.
-- =====================================================================

create table public.analytics_sessions (
  id               uuid primary key,                       -- generated client-side per tab-session
  user_id          uuid references public.profiles(id) on delete set null,
  visitor_id       text check (visitor_id is null or visitor_id ~ '^[a-zA-Z0-9_-]{8,64}$'),
  started_at       timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  landing_path     text,
  exit_path        text,
  referrer_host    text,
  traffic_source   text not null default 'direct' check (traffic_source in ('direct','organic','social','referral','email','paid','internal')),
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  device_category  text check (device_category in ('desktop','mobile','tablet','bot','unknown')),
  browser          text,
  os               text,
  country          text,
  page_views       int not null default 0,
  events           int not null default 0,
  engaged_seconds  int not null default 0,
  is_new_visitor   boolean not null default true
);
create index analytics_sessions_started_idx on public.analytics_sessions (started_at desc);
create index analytics_sessions_user_idx on public.analytics_sessions (user_id, started_at desc);
create index analytics_sessions_visitor_idx on public.analytics_sessions (visitor_id, started_at desc);

create table public.analytics_events (
  id               bigint generated always as identity primary key,
  event_id         uuid not null unique,                   -- client-generated, idempotent retries
  event_name       text not null check (event_name ~ '^[a-z_]{3,60}$'),
  user_id          uuid references public.profiles(id) on delete set null,
  session_id       uuid,
  visitor_id       text,
  feature          text,
  content_type     text,
  content_id       uuid,
  path             text,
  engaged_seconds  int check (engaged_seconds is null or engaged_seconds between 0 and 86400),
  device_category  text,
  referrer_host    text,
  country          text,
  metadata         jsonb not null default '{}'::jsonb check (pg_column_size(metadata) < 4096),
  dedupe_key       text unique,
  occurred_at      timestamptz not null default now()
);
create index analytics_events_time_idx on public.analytics_events (occurred_at desc);
create index analytics_events_user_idx on public.analytics_events (user_id, occurred_at desc);
create index analytics_events_name_idx on public.analytics_events (event_name, occurred_at desc);
create index analytics_events_content_idx on public.analytics_events (content_id, event_name);
create index analytics_events_session_idx on public.analytics_events (session_id);

create table public.visitor_presence (
  presence_key         text primary key,        -- 'u:<uuid>' or 'a:<visitor/session id>' — one row per person, not per tab
  user_id              uuid references public.profiles(id) on delete cascade,
  session_id           uuid,
  current_path         text,
  current_feature      text,
  state                text not null default 'active' check (state in ('active','idle')),
  session_started_at   timestamptz not null default now(),
  last_heartbeat_at    timestamptz not null default now(),
  last_interaction_at  timestamptz,
  device_category      text,
  browser              text,
  country              text,
  traffic_source       text,
  open_tabs            jsonb not null default '{}'::jsonb   -- {tab_id: last_seen_epoch}
);
create index visitor_presence_heartbeat_idx on public.visitor_presence (last_heartbeat_at desc);

create table public.daily_user_activity (
  user_id                uuid not null references public.profiles(id) on delete cascade,
  day                    date not null,
  sessions               int not null default 0,
  page_views             int not null default 0,
  engaged_seconds        int not null default 0,
  articles_read          int not null default 0,
  broker_articles_read   int not null default 0,
  trading_articles_read  int not null default 0,
  prompts_viewed         int not null default 0,
  prompts_copied         int not null default 0,
  scripts_viewed         int not null default 0,
  scripts_copied         int not null default 0,
  ai_generations         int not null default 0,
  content_saved          int not null default 0,
  notifications_opened   int not null default 0,
  external_clicks        int not null default 0,
  is_active_day          boolean not null default false,
  score                  numeric(10,2) not null default 0,
  first_seen_at          timestamptz,
  last_seen_at           timestamptz,
  primary key (user_id, day)
);
create index daily_user_activity_day_idx on public.daily_user_activity (day, score desc);

create table public.user_engagement_scores (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  total_score      numeric(12,2) not null default 0,
  score_7d         numeric(12,2) not null default 0,
  score_30d        numeric(12,2) not null default 0,
  active_days      int not null default 0,
  current_streak   int not null default 0,
  longest_streak   int not null default 0,
  last_active_day  date,
  rank_all_time    int,
  previous_rank    int,
  updated_at       timestamptz not null default now()
);
create index user_engagement_scores_rank_idx on public.user_engagement_scores (rank_all_time);

create table public.daily_analytics_summary (
  day                  date primary key,
  unique_visitors      int not null default 0,
  guest_visitors       int not null default 0,
  registered_visitors  int not null default 0,
  new_visitors         int not null default 0,
  returning_visitors   int not null default 0,
  sessions             int not null default 0,
  engaged_sessions     int not null default 0,
  bounces              int not null default 0,
  page_views           int not null default 0,
  engaged_seconds      bigint not null default 0,
  registrations        int not null default 0,
  articles_read        int not null default 0,
  prompts_copied       int not null default 0,
  scripts_copied       int not null default 0,
  ai_generations       int not null default 0,
  updated_at           timestamptz not null default now()
);

create table public.content_analytics_summary (
  content_type      text not null,
  content_id        uuid not null,
  day               date not null,
  views             int not null default 0,
  unique_viewers    int not null default 0,
  registered_views  int not null default 0,
  guest_views       int not null default 0,
  engaged_seconds   int not null default 0,
  copies            int not null default 0,
  unique_copiers    int not null default 0,
  saves             int not null default 0,
  shares            int not null default 0,
  ai_actions        int not null default 0,
  last_accessed_at  timestamptz,
  primary key (content_type, content_id, day)
);
create index content_analytics_summary_day_idx on public.content_analytics_summary (day);

create table public.user_retention_cohorts (
  cohort_type   text not null check (cohort_type in ('week','month')),
  cohort_start  date not null,
  period        int not null,
  cohort_size   int not null,
  retained      int not null,
  computed_at   timestamptz not null default now(),
  primary key (cohort_type, cohort_start, period)
);

create table public.analytics_reports (
  id           uuid primary key default gen_random_uuid(),
  report_type  text not null,
  params       jsonb not null default '{}'::jsonb,
  format       text not null default 'csv',
  row_count    int not null default 0,
  contains_pii boolean not null default false,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index analytics_reports_created_idx on public.analytics_reports (created_at desc);
