-- =====================================================================
-- 0003 Member content, AI, communication, administration
-- =====================================================================

-- ---------- AI ----------
create table public.ai_provider_settings (
  id                    int primary key default 1 check (id = 1),     -- singleton
  enabled               boolean not null default false,
  member_enabled        boolean not null default true,
  active_provider       text not null default 'gemini' check (active_provider in ('gemini','openai','anthropic','openai_compatible')),
  model                 text not null default 'gemini-2.5-flash',
  fallback_provider     text check (fallback_provider is null or fallback_provider in ('gemini','openai','anthropic','openai_compatible')),
  fallback_model        text,
  temperature           numeric(3,2) not null default 0.70 check (temperature between 0 and 2),
  max_output_tokens     int not null default 1200 check (max_output_tokens between 64 and 16000),
  default_language      text not null default 'en',
  system_instructions   text not null default '',
  per_user_daily_limit  int not null default 20 check (per_user_daily_limit between 0 and 10000),
  global_daily_limit    int not null default 2000 check (global_daily_limit >= 0),
  global_monthly_limit  int not null default 40000 check (global_monthly_limit >= 0),
  timeout_ms            int not null default 30000 check (timeout_ms between 2000 and 120000),
  cost_input_per_million  numeric(10,4) not null default 0,
  cost_output_per_million numeric(10,4) not null default 0,
  updated_by            uuid references public.profiles(id) on delete set null,
  updated_at            timestamptz not null default now()
);
insert into public.ai_provider_settings (id) values (1);

create table public.ai_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  content_type  text not null,
  instructions  text not null check (char_length(instructions) <= 8000),
  scope         text not null default 'admin' check (scope in ('admin','member','both')),
  is_active     boolean not null default true,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger ai_templates_updated_at before update on public.ai_templates
  for each row execute function public.set_updated_at();

create table public.ai_generations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  content_type  text not null,
  source_type   text not null check (source_type in ('article','topic','text','banner_prompt','video_script')),
  source_id     uuid,
  title         text,
  options       jsonb not null default '{}'::jsonb,
  output        text not null default '',
  status        text not null default 'completed' check (status in ('completed','failed')),
  provider      text,
  model         text,
  is_saved      boolean not null default false,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index ai_generations_user_idx on public.ai_generations (user_id, created_at desc);
create trigger ai_generations_updated_at before update on public.ai_generations
  for each row execute function public.set_updated_at();

create table public.ai_usage_logs (
  id             bigint generated always as identity primary key,
  user_id        uuid references public.profiles(id) on delete set null,
  generation_id  uuid references public.ai_generations(id) on delete set null,
  feature        text not null default 'member_studio',
  provider       text not null,
  model          text not null,
  status         text not null check (status in ('success','failed','rate_limited','timeout','not_configured')),
  error_code     text,
  input_tokens   int,
  output_tokens  int,
  est_cost_usd   numeric(12,6),
  latency_ms     int,
  created_at     timestamptz not null default now()
);
create index ai_usage_logs_created_idx on public.ai_usage_logs (created_at desc);
create index ai_usage_logs_user_idx on public.ai_usage_logs (user_id, created_at desc);

-- ---------- saved content ----------
create table public.user_collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create table public.saved_content (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  content_type  text not null check (content_type in ('article','banner_prompt','video_script','ai_generation','broker')),
  content_id    uuid not null,
  title         text,
  created_at    timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);
create index saved_content_user_idx on public.saved_content (user_id, created_at desc);

create table public.collection_items (
  collection_id  uuid not null references public.user_collections(id) on delete cascade,
  saved_id       uuid not null references public.saved_content(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (collection_id, saved_id)
);

create table public.favourite_brokers (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  broker_id   uuid not null references public.brokers(id) on delete cascade,
  notify      boolean not null default true,
  created_at  timestamptz not null default now(),
  primary key (user_id, broker_id)
);
create index favourite_brokers_broker_idx on public.favourite_brokers (broker_id);

-- ---------- segments ----------
create table public.user_segments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  rules       jsonb not null default '{}'::jsonb,
  is_system   boolean not null default false,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger user_segments_updated_at before update on public.user_segments
  for each row execute function public.set_updated_at();

-- ---------- notifications ----------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) <= 160),
  body          text check (char_length(body) <= 1000),
  category      text not null check (category in
                  ('breaking_broker','trading','new_prompt','new_script','followed_broker','announcement','account')),
  link          text,
  audience      jsonb not null default '{"type":"all"}'::jsonb,
  channels      text[] not null default '{in_app}',
  status        text not null default 'draft' check (status in ('draft','scheduled','sending','sent','cancelled')),
  is_template   boolean not null default false,
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  recipients    int not null default 0,
  dedupe_key    text unique,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index notifications_status_idx on public.notifications (status, scheduled_at);

create table public.user_notifications (
  id               uuid primary key default gen_random_uuid(),
  notification_id  uuid not null references public.notifications(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  read_at          timestamptz,
  opened_at        timestamptz,
  created_at       timestamptz not null default now(),
  unique (notification_id, user_id)
);
create index user_notifications_user_idx on public.user_notifications (user_id, created_at desc);
create index user_notifications_unread_idx on public.user_notifications (user_id) where read_at is null;

create table public.notification_preferences (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  breaking_broker   boolean not null default true,
  trading           boolean not null default true,
  new_prompt        boolean not null default true,
  new_script        boolean not null default true,
  followed_broker   boolean not null default true,
  announcement      boolean not null default true,
  email_enabled     boolean not null default false,
  push_enabled      boolean not null default false,
  updated_at        timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  user_id            uuid references public.profiles(id) on delete set null,
  status             text not null default 'subscribed' check (status in ('pending','subscribed','unsubscribed')),
  consent_source     text not null default 'footer',
  consent_text       text,
  consent_at         timestamptz not null default now(),
  unsubscribed_at    timestamptz,
  unsubscribe_token  text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_at         timestamptz not null default now()
);

create table public.newsletter_campaigns (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null,
  preheader     text,
  body          text not null default '',
  segment_id    uuid references public.user_segments(id) on delete set null,
  status        text not null default 'draft' check (status in ('draft','scheduled','sending','sent','cancelled')),
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  recipients    int not null default 0,
  delivery_log  jsonb not null default '[]'::jsonb,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger newsletter_campaigns_updated_at before update on public.newsletter_campaigns
  for each row execute function public.set_updated_at();

create table public.contact_messages (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'contact' check (kind in ('contact','support','correction','partnership')),
  name            text not null check (char_length(name) <= 120),
  email           text not null check (char_length(email) <= 200),
  subject         text not null check (char_length(subject) <= 200),
  message         text not null check (char_length(message) <= 5000),
  user_id         uuid references public.profiles(id) on delete set null,
  status          text not null default 'new' check (status in ('new','in_progress','replied','resolved','archived')),
  assigned_to     uuid references public.profiles(id) on delete set null,
  internal_notes  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);
create trigger contact_messages_updated_at before update on public.contact_messages
  for each row execute function public.set_updated_at();

create table public.advertising_enquiries (
  id              uuid primary key default gen_random_uuid(),
  company         text not null check (char_length(company) <= 160),
  contact_name    text not null check (char_length(contact_name) <= 120),
  email           text not null check (char_length(email) <= 200),
  website         text,
  budget          text,
  message         text not null check (char_length(message) <= 5000),
  status          text not null default 'new' check (status in ('new','in_progress','replied','resolved','archived')),
  assigned_to     uuid references public.profiles(id) on delete set null,
  internal_notes  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger advertising_enquiries_updated_at before update on public.advertising_enquiries
  for each row execute function public.set_updated_at();

-- ---------- administration ----------
create table public.admin_audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles(id) on delete set null,
  actor_email  text,
  action       text not null,
  resource     text not null,
  resource_id  text,
  summary      jsonb not null default '{}'::jsonb,
  result       text not null default 'success' check (result in ('success','failure')),
  created_at   timestamptz not null default now()
);
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_actor_idx on public.admin_audit_logs (actor_id, created_at desc);
create index admin_audit_logs_resource_idx on public.admin_audit_logs (resource, resource_id);

create or replace function public.block_audit_mutation()
returns trigger language plpgsql as $$
begin
  if current_setting('app.allow_audit_purge', true) = 'on' and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'Audit logs are append-only' using errcode = '42501';
end $$;
create trigger admin_audit_logs_immutable before update or delete on public.admin_audit_logs
  for each row execute function public.block_audit_mutation();

create table public.admin_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  note        text not null check (char_length(note) <= 4000),
  created_at  timestamptz not null default now()
);
create index admin_notes_user_idx on public.admin_notes (user_id, created_at desc);

create table public.website_settings (
  key         text primary key check (key ~ '^[a-z0-9_.]{2,80}$'),
  value       jsonb not null,
  is_public   boolean not null default false,
  description text,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);
create trigger website_settings_updated_at before update on public.website_settings
  for each row execute function public.set_updated_at();

create table public.homepage_sections (
  key         text primary key,
  title       text not null,
  content     jsonb not null default '{}'::jsonb,
  is_visible  boolean not null default true,
  sort_order  int not null default 100,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);
create trigger homepage_sections_updated_at before update on public.homepage_sections
  for each row execute function public.set_updated_at();

create table public.navigation_items (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.navigation_items(id) on delete cascade,
  label       text not null,
  href        text not null,
  sort_order  int not null default 100,
  is_visible  boolean not null default true
);

create table public.footer_sections (
  id          uuid primary key default gen_random_uuid(),
  column_key  text not null unique,
  title       text not null,
  items       jsonb not null default '[]'::jsonb,     -- [{label, href, visible}]
  sort_order  int not null default 100,
  is_visible  boolean not null default true
);

create table public.social_links (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null unique check (platform in ('facebook','linkedin','instagram','youtube','telegram','x','tiktok','whatsapp')),
  label           text not null,
  url             text not null default '#',
  show_in_footer  boolean not null default true,
  sort_order      int not null default 100,
  is_visible      boolean not null default true
);

create table public.advertisements (
  id               uuid primary key default gen_random_uuid(),
  advertiser       text not null,
  campaign_name    text not null,
  image_url        text,
  headline         text,
  destination_url  text not null check (destination_url ~* '^https?://'),
  placement        text not null check (placement in
                     ('home_banner','news_listing','article_page','member_dashboard','sponsored_broker','sponsored_article','featured_broker')),
  is_affiliate     boolean not null default false,
  starts_at        timestamptz not null default now(),
  ends_at          timestamptz,
  is_active        boolean not null default false,
  impressions      bigint not null default 0,
  clicks           bigint not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index advertisements_live_idx on public.advertisements (placement, is_active, starts_at, ends_at);
create trigger advertisements_updated_at before update on public.advertisements
  for each row execute function public.set_updated_at();

create table public.advertisement_events (
  id           bigint generated always as identity primary key,
  ad_id        uuid not null references public.advertisements(id) on delete cascade,
  event_type   text not null check (event_type in ('impression','click')),
  session_id   uuid,
  occurred_at  timestamptz not null default now()
);
create index advertisement_events_ad_idx on public.advertisement_events (ad_id, occurred_at desc);

create table public.scheduled_jobs (
  key               text primary key,
  name              text not null,
  description       text,
  enabled           boolean not null default true,
  interval_minutes  int not null default 60 check (interval_minutes between 1 and 10080),
  config            jsonb not null default '{}'::jsonb,
  last_run_at       timestamptz,
  last_status       text,
  last_error        text,
  next_run_at       timestamptz not null default now(),
  locked_until      timestamptz,
  updated_at        timestamptz not null default now()
);
create trigger scheduled_jobs_updated_at before update on public.scheduled_jobs
  for each row execute function public.set_updated_at();

create table public.job_execution_logs (
  id           bigint generated always as identity primary key,
  job_key      text not null references public.scheduled_jobs(key) on delete cascade,
  trigger      text not null default 'schedule',
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'running' check (status in ('running','success','failed','skipped')),
  details      jsonb not null default '{}'::jsonb
);
create index job_execution_logs_job_idx on public.job_execution_logs (job_key, started_at desc);

create table public.feature_flags (
  key          text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  description  text not null,
  enabled      boolean not null default true,
  updated_at   timestamptz not null default now()
);
create trigger feature_flags_updated_at before update on public.feature_flags
  for each row execute function public.set_updated_at();

create table public.media_library (
  id           uuid primary key default gen_random_uuid(),
  bucket       text not null default 'media',
  path         text not null,
  url          text not null,
  mime_type    text not null,
  size_bytes   int not null,
  alt_text     text,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (bucket, path)
);

create table public.system_error_logs (
  id          bigint generated always as identity primary key,
  level       text not null default 'error' check (level in ('error','warn','info')),
  source      text not null,
  message     text not null,
  context     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index system_error_logs_created_idx on public.system_error_logs (created_at desc);

create table public.redirects (
  id           uuid primary key default gen_random_uuid(),
  from_path    text not null unique check (from_path ~ '^/'),
  to_path      text not null,
  status_code  int not null default 301 check (status_code in (301,302,307,308)),
  created_at   timestamptz not null default now()
);

create table public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  hits          int not null default 0,
  primary key (key, window_start)
);

-- ---------- new user bootstrap ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_marketing boolean := coalesce((m->>'marketing_consent')::boolean, false);
  v_prof text := nullif(m->>'profession', '');
begin
  insert into public.profiles (id, full_name, email, phone_country_code, phone, country, profession, email_verified_at)
  values (
    new.id,
    left(coalesce(m->>'full_name', ''), 120),
    coalesce(new.email, ''),
    nullif(m->>'phone_country_code', ''),
    nullif(regexp_replace(coalesce(m->>'phone', ''), '[^0-9 ]', '', 'g'), ''),
    nullif(upper(left(coalesce(m->>'country', ''), 2)), ''),
    case when v_prof in ('trader','introducing_broker','broker_employee','affiliate_partner','content_creator',
                         'financial_analyst','business_owner','other') then v_prof else null end,
    new.email_confirmed_at)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_key) values (new.id, 'member') on conflict do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;

  if coalesce((m->>'terms_accepted')::boolean, false) then
    insert into public.user_consents (user_id, consent_type, granted, version, source)
    values (new.id, 'terms', true, coalesce(m->>'terms_version', '1.0'), 'registration'),
           (new.id, 'privacy', true, coalesce(m->>'terms_version', '1.0'), 'registration');
  end if;
  insert into public.user_consents (user_id, consent_type, granted, source)
  values (new.id, 'marketing', v_marketing, 'registration');

  if v_marketing and new.email is not null then
    insert into public.newsletter_subscribers (email, user_id, status, consent_source, consent_text)
    values (lower(new.email), new.id, 'subscribed', 'registration', 'Opted in at registration')
    on conflict (email) do update set user_id = excluded.user_id, status = 'subscribed',
      consent_source = 'registration', consent_at = now(), unsubscribed_at = null;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set email = coalesce(new.email, email),
         email_verified_at = new.email_confirmed_at,
         last_login_at = coalesce(new.last_sign_in_at, last_login_at)
   where id = new.id;
  return new;
end $$;

create trigger on_auth_user_updated after update of email, email_confirmed_at, last_sign_in_at on auth.users
  for each row execute function public.handle_user_email_change();
