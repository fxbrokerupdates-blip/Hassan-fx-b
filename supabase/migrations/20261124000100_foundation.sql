-- =====================================================================
-- FX Broker Updates — 0001 Foundation: users, roles, permissions
-- All timestamps are UTC (timestamptz). Display timezone is applied in the UI.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- generic helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- True for the service role and direct database sessions (migrations, SQL editor).
-- Uses the session "role" setting, which SECURITY DEFINER functions do not change.
create or replace function public.is_trusted_backend()
returns boolean language sql stable as $$
  select coalesce(nullif(current_setting('role', true), 'none'), session_user::text)
         in ('postgres', 'service_role', 'supabase_admin', 'supabase_auth_admin')
$$;

-- ---------- roles & permissions ----------
create table public.roles (
  key          text primary key check (key ~ '^[a-z_]{2,40}$'),
  name         text not null,
  description  text,
  is_staff     boolean not null default true,
  rank         int not null default 0,          -- higher = more privileged
  created_at   timestamptz not null default now()
);

create table public.permissions (
  key          text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  module       text not null,
  description  text not null
);

create table public.role_permissions (
  role_key        text not null references public.roles(key) on delete cascade,
  permission_key  text not null references public.permissions(key) on delete cascade,
  primary key (role_key, permission_key)
);

-- ---------- profiles ----------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text not null default '' check (char_length(full_name) <= 120),
  email               text not null default '',
  phone_country_code  text check (phone_country_code is null or phone_country_code ~ '^\+[0-9]{1,4}$'),
  phone               text check (phone is null or phone ~ '^[0-9 ]{5,20}$'),
  country             text check (country is null or char_length(country) <= 2),
  profession          text check (profession is null or profession in
                        ('trader','introducing_broker','broker_employee','affiliate_partner',
                         'content_creator','financial_analyst','business_owner','other')),
  avatar_url          text,
  preferred_language  text not null default 'en',
  timezone            text not null default 'UTC',
  status              text not null default 'active' check (status in ('active','suspended','pending_deletion','deleted')),
  suspended_reason    text,
  email_verified_at   timestamptz,
  last_login_at       timestamptz,
  last_active_at      timestamptz,
  ai_daily_limit      int check (ai_daily_limit is null or ai_daily_limit between 0 and 10000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index profiles_created_at_idx on public.profiles (created_at desc);
create index profiles_country_idx on public.profiles (country);
create index profiles_profession_idx on public.profiles (profession);
create index profiles_status_idx on public.profiles (status);
create index profiles_name_trgm_idx on public.profiles using gin (full_name gin_trgm_ops);
create index profiles_email_trgm_idx on public.profiles using gin (email gin_trgm_ops);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role_key    text not null references public.roles(key) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (user_id, role_key)
);
create index user_roles_role_idx on public.user_roles (role_key);

create table public.user_preferences (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  market_categories  text[] not null default '{}',
  content_languages  text[] not null default '{en}',
  dashboard          jsonb not null default '{}'::jsonb,
  analytics_consent  boolean,                    -- null = not answered
  updated_at         timestamptz not null default now()
);
create trigger user_preferences_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

create table public.user_feature_access (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  feature_key  text not null check (feature_key in ('banner_prompts','video_scripts','ai_studio','saved_content','notifications')),
  enabled      boolean not null default true,
  updated_by   uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now(),
  primary key (user_id, feature_key)
);

create table public.user_consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms','privacy','marketing','analytics')),
  granted      boolean not null,
  version      text not null default '1.0',
  source       text not null default 'web',
  created_at   timestamptz not null default now()
);
create index user_consents_user_idx on public.user_consents (user_id, consent_type, created_at desc);

create table public.account_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  request_type  text not null check (request_type in ('data_export','account_deletion','data_access')),
  status        text not null default 'pending' check (status in ('pending','in_progress','completed','rejected')),
  user_note     text check (char_length(user_note) <= 1000),
  admin_note    text,
  processed_by  uuid references public.profiles(id) on delete set null,
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index account_requests_status_idx on public.account_requests (status, created_at desc);

-- ---------- permission helpers ----------
create or replace function public.has_role(p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role_key = p_role)
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('super_admin')
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur join public.roles r on r.key = ur.role_key
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and r.is_staff and p.status = 'active')
$$;

create or replace function public.has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.status = 'active'
    left join public.role_permissions rp on rp.role_key = ur.role_key
    where ur.user_id = auth.uid()
      and (ur.role_key = 'super_admin' or rp.permission_key = p_permission))
$$;

create or replace function public.my_permissions()
returns text[] language sql stable security definer set search_path = public as $$
  select case when public.is_super_admin() then (select coalesce(array_agg(key order by key), '{}') from public.permissions)
  else (select coalesce(array_agg(distinct rp.permission_key), '{}')
        from public.user_roles ur
        join public.profiles p on p.id = ur.user_id and p.status = 'active'
        join public.role_permissions rp on rp.role_key = ur.role_key
        where ur.user_id = auth.uid()) end
$$;

-- Members may update their own profile, but never their own status, limits or verification.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- pg_trigger_depth() > 1: update issued by our own auth-sync trigger (email verification, last login).
  if public.is_trusted_backend() or pg_trigger_depth() > 1 or public.has_permission('users.manage') then
    return new;
  end if;
  new.id := old.id;
  new.email := old.email;
  new.status := old.status;
  new.suspended_reason := old.suspended_reason;
  new.email_verified_at := old.email_verified_at;
  new.ai_daily_limit := old.ai_daily_limit;
  new.last_login_at := old.last_login_at;
  new.created_at := old.created_at;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Only a super admin may grant/revoke the super_admin or administrator roles.
create or replace function public.protect_role_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(new.role_key, old.role_key);
begin
  if public.is_trusted_backend() then return coalesce(new, old); end if;
  if v_role in ('super_admin','administrator') and not public.is_super_admin() then
    raise exception 'Only a Super Admin can change the % role', v_role using errcode = '42501';
  end if;
  if tg_op = 'DELETE' and old.user_id = auth.uid() and old.role_key = 'super_admin' then
    raise exception 'You cannot remove your own Super Admin role' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger user_roles_protect before insert or update or delete on public.user_roles
  for each row execute function public.protect_role_changes();

-- ---------- reference data: roles ----------
insert into public.roles (key, name, description, is_staff, rank) values
  ('super_admin',       'Super Admin',       'Full access including role management',            true, 100),
  ('administrator',     'Administrator',     'Full operational access except Super Admin grants',  true, 90),
  ('editor',            'Editor',            'Edits and publishes editorial content',             true, 60),
  ('news_manager',      'News Manager',      'Manages news, sources and collection jobs',         true, 60),
  ('content_creator',   'Content Creator',   'Creates prompts, scripts and drafts',               true, 40),
  ('marketing_manager', 'Marketing Manager', 'Homepage, ads, newsletter and notifications',       true, 50),
  ('support_manager',   'Support Manager',   'Users, inbox and support requests',                 true, 50),
  ('analytics_viewer',  'Analytics Viewer',  'Read-only analytics access',                        true, 30),
  ('member',            'Member',            'Registered website member',                         false, 0);

insert into public.permissions (key, module, description) values
  ('dashboard.view',          'admin',         'Open the admin panel and overview'),
  ('analytics.view',          'analytics',     'View aggregate analytics, rankings and reports'),
  ('analytics.live',          'analytics',     'View live visitors'),
  ('analytics.users',         'analytics',     'View individual user activity timelines'),
  ('analytics.export',        'analytics',     'Export analytics reports'),
  ('users.view',              'users',         'View user directory and profiles'),
  ('users.pii',               'users',         'View user email and phone'),
  ('users.manage',            'users',         'Suspend, reactivate, verify and edit users'),
  ('users.export',            'users',         'Export user lists'),
  ('roles.manage',            'users',         'Assign staff roles and permissions'),
  ('news.view',               'news',          'View all news including drafts'),
  ('news.edit',               'news',          'Create and edit news'),
  ('news.publish',            'news',          'Publish, schedule and unpublish news'),
  ('news.delete',             'news',          'Delete news permanently'),
  ('brokers.manage',          'brokers',       'Manage broker directory, reviews, promotions'),
  ('prompts.manage',          'content',       'Manage daily banner prompts'),
  ('scripts.manage',          'content',       'Manage daily video scripts'),
  ('content_reports.manage',  'content',       'Review user-submitted content reports'),
  ('sources.manage',          'news',          'Manage news sources'),
  ('jobs.manage',             'system',        'Run and manage background jobs'),
  ('ai.use_admin',            'ai',            'Use the admin AI Creator Studio'),
  ('ai.settings',             'ai',            'Change AI provider settings and view usage'),
  ('automation.manage',       'ai',            'Configure daily content automation'),
  ('homepage.manage',         'website',       'Manage homepage, navigation, footer and social links'),
  ('ads.manage',              'marketing',     'Manage advertisements'),
  ('newsletter.manage',       'marketing',     'Manage newsletter subscribers and campaigns'),
  ('notifications.manage',    'marketing',     'Create and send notifications'),
  ('inbox.manage',            'support',       'Manage contact and advertising enquiries'),
  ('settings.manage',         'system',        'Change global settings and feature flags'),
  ('audit.view',              'system',        'View admin audit logs'),
  ('health.view',             'system',        'View system health');

insert into public.role_permissions (role_key, permission_key)
select 'administrator', key from public.permissions where key <> 'roles.manage';

insert into public.role_permissions (role_key, permission_key) values
  ('editor','dashboard.view'),('editor','news.view'),('editor','news.edit'),('editor','news.publish'),
  ('editor','brokers.manage'),('editor','prompts.manage'),('editor','scripts.manage'),('editor','ai.use_admin'),
  ('editor','content_reports.manage'),
  ('news_manager','dashboard.view'),('news_manager','news.view'),('news_manager','news.edit'),('news_manager','news.publish'),
  ('news_manager','news.delete'),('news_manager','sources.manage'),('news_manager','jobs.manage'),('news_manager','ai.use_admin'),
  ('news_manager','automation.manage'),('news_manager','content_reports.manage'),('news_manager','health.view'),
  ('content_creator','dashboard.view'),('content_creator','news.view'),('content_creator','news.edit'),
  ('content_creator','prompts.manage'),('content_creator','scripts.manage'),('content_creator','ai.use_admin'),
  ('marketing_manager','dashboard.view'),('marketing_manager','homepage.manage'),('marketing_manager','ads.manage'),
  ('marketing_manager','newsletter.manage'),('marketing_manager','notifications.manage'),('marketing_manager','analytics.view'),
  ('marketing_manager','analytics.export'),
  ('support_manager','dashboard.view'),('support_manager','users.view'),('support_manager','users.pii'),
  ('support_manager','users.manage'),('support_manager','inbox.manage'),('support_manager','content_reports.manage'),
  ('support_manager','analytics.users'),
  ('analytics_viewer','dashboard.view'),('analytics_viewer','analytics.view'),('analytics_viewer','analytics.live'),
  ('analytics_viewer','analytics.users'),('analytics_viewer','analytics.export');
