-- =====================================================================
-- 0002 Content: categories, brokers, news, sources, prompts, scripts
-- =====================================================================

create table public.news_categories (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name              text not null,
  description       text,
  news_type         text not null default 'both' check (news_type in ('broker','trading','both')),
  icon              text not null default 'newspaper',
  sort_order        int not null default 100,
  show_on_home      boolean not null default false,
  home_description  text,
  is_active         boolean not null default true,
  seo_title         text,
  seo_description   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger news_categories_updated_at before update on public.news_categories
  for each row execute function public.set_updated_at();

create table public.brokers (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name                  text not null,
  logo_url              text,
  website_url           text,
  founded_year          int check (founded_year is null or founded_year between 1900 and 2100),
  headquarters          text,
  countries_served      text[] not null default '{}',
  platforms             text[] not null default '{}',
  account_types         text[] not null default '{}',
  min_deposit           text,
  instruments           text[] not null default '{}',
  payment_methods       text[] not null default '{}',
  social_links          jsonb not null default '{}'::jsonb,
  short_description     text,
  editorial_review      text,
  is_featured           boolean not null default false,
  is_sponsored          boolean not null default false,
  affiliate_disclosure  text,
  status                text not null default 'active' check (status in ('active','archived')),
  last_verified_at      timestamptz,
  seo_title             text,
  seo_description       text,
  is_sample             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index brokers_name_trgm_idx on public.brokers using gin (name gin_trgm_ops);
create trigger brokers_updated_at before update on public.brokers
  for each row execute function public.set_updated_at();

create table public.broker_regulations (
  id                uuid primary key default gen_random_uuid(),
  broker_id         uuid not null references public.brokers(id) on delete cascade,
  regulator         text not null,
  license_number    text,
  jurisdiction      text,
  status            text not null default 'unverified' check (status in ('verified','unverified','revoked','expired')),
  verification_url  text not null check (verification_url ~* '^https?://'),   -- source reference is mandatory
  verified_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index broker_regulations_broker_idx on public.broker_regulations (broker_id);

create table public.broker_reviews (
  id           uuid primary key default gen_random_uuid(),
  broker_id    uuid not null references public.brokers(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  review_type  text not null check (review_type in ('editorial','user','sponsored')),
  rating       numeric(2,1) check (rating is null or rating between 1 and 5),
  title        text not null check (char_length(title) <= 160),
  body         text not null check (char_length(body) <= 10000),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now()
);
create index broker_reviews_broker_idx on public.broker_reviews (broker_id, status);

create table public.broker_promotions (
  id           uuid primary key default gen_random_uuid(),
  broker_id    uuid not null references public.brokers(id) on delete cascade,
  title        text not null,
  description  text,
  terms_url    text,
  source_url   text,
  starts_at    timestamptz,
  ends_at      timestamptz,
  is_verified  boolean not null default false,
  status       text not null default 'draft' check (status in ('draft','active','expired','archived')),
  created_at   timestamptz not null default now()
);
create index broker_promotions_broker_idx on public.broker_promotions (broker_id, status);

create table public.news_sources (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  website_url         text,
  feed_url            text not null check (feed_url ~* '^https://'),
  source_type         text not null default 'rss' check (source_type in
                        ('broker_rss','broker_press','financial_rss','news_api','regulator','central_bank','institution','licensed_data','public')),
  news_type           text not null default 'broker' check (news_type in ('broker','trading')),
  category_id         uuid references public.news_categories(id) on delete set null,
  broker_id           uuid references public.brokers(id) on delete set null,
  language            text not null default 'en',
  country             text,
  priority            int not null default 50 check (priority between 0 and 100),
  refresh_minutes     int not null default 15 check (refresh_minutes between 2 and 1440),
  enabled             boolean not null default false,
  trusted             boolean not null default false,
  auto_publish        boolean not null default false,
  collection_permitted boolean not null default false,   -- confirms terms allow automated collection
  last_fetched_at     timestamptz,
  last_success_at     timestamptz,
  last_failure_at     timestamptz,
  last_error          text,
  error_count         int not null default 0,
  consecutive_failures int not null default 0,
  articles_collected  int not null default 0,
  next_run_at         timestamptz not null default now(),
  locked_until        timestamptz,
  etag                text,
  last_modified       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint auto_publish_requires_trust check (not auto_publish or trusted)
);
create index news_sources_due_idx on public.news_sources (enabled, next_run_at);
create trigger news_sources_updated_at before update on public.news_sources
  for each row execute function public.set_updated_at();

create table public.news_articles (
  id                    uuid primary key default gen_random_uuid(),
  news_type             text not null check (news_type in ('broker','trading')),
  slug                  text not null unique check (slug ~ '^[a-z0-9-]{3,160}$'),
  title                 text not null check (char_length(title) between 3 and 300),
  summary               text check (char_length(summary) <= 2000),
  content               text,                                   -- original editorial content only
  content_origin        text not null default 'original' check (content_origin in ('original','ai_assisted','source_excerpt')),
  key_highlights        text[] not null default '{}',
  featured_image_url    text,
  category_id           uuid references public.news_categories(id) on delete set null,
  broker_id             uuid references public.brokers(id) on delete set null,
  market                text check (market is null or market in
                          ('gold','forex','crypto','global_economy','central_banks','geopolitics','us_economy',
                           'stock_markets','commodities','oil','economic_data','market_analysis','other')),
  market_impact         text check (market_impact is null or market_impact in ('high','medium','low')),
  country               text,
  author_name           text,
  author_id             uuid references public.profiles(id) on delete set null,
  source_id             uuid references public.news_sources(id) on delete set null,
  source_name           text,
  original_url          text check (original_url is null or original_url ~* '^https?://'),
  original_published_at timestamptz,
  priority              text not null default 'normal' check (priority in ('hot','warm','normal')),
  status                text not null default 'draft' check (status in ('draft','pending_review','scheduled','published','archived','rejected')),
  needs_review_reason   text,
  published_at          timestamptz,
  scheduled_at          timestamptz,
  is_featured           boolean not null default false,
  show_on_home          boolean not null default true,
  reading_minutes       int not null default 1,
  seo_title             text,
  seo_description       text,
  canonical_url         text,
  noindex               boolean not null default false,
  dedupe_hash           text unique,
  title_fingerprint     text,
  is_sample             boolean not null default false,
  view_count            int not null default 0,
  created_by            uuid references public.profiles(id) on delete set null,
  updated_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  search                tsvector generated always as (
                          setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                          setweight(to_tsvector('simple', coalesce(summary, '')), 'B')) stored
);
create index news_articles_public_idx on public.news_articles (status, news_type, published_at desc);
create index news_articles_category_idx on public.news_articles (category_id, published_at desc);
create index news_articles_broker_idx on public.news_articles (broker_id, published_at desc);
create index news_articles_market_idx on public.news_articles (market, published_at desc);
create index news_articles_priority_idx on public.news_articles (priority, published_at desc);
create index news_articles_scheduled_idx on public.news_articles (scheduled_at) where status = 'scheduled';
create index news_articles_search_idx on public.news_articles using gin (search);
create index news_articles_fingerprint_idx on public.news_articles (title_fingerprint);
-- view_count increments must not bump updated_at
create or replace function public.news_set_updated_at()
returns trigger language plpgsql as $$
declare o public.news_articles := old;
begin
  o.view_count := new.view_count;
  o.updated_at := new.updated_at;
  o.search := new.search;
  if o is distinct from new then new.updated_at := now(); end if;
  return new;
end $$;
create trigger news_articles_updated_at before update on public.news_articles
  for each row execute function public.news_set_updated_at();

create table public.news_tags (
  id    uuid primary key default gen_random_uuid(),
  slug  text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  name  text not null
);

create table public.news_article_tags (
  article_id  uuid not null references public.news_articles(id) on delete cascade,
  tag_id      uuid not null references public.news_tags(id) on delete cascade,
  primary key (article_id, tag_id)
);
create index news_article_tags_tag_idx on public.news_article_tags (tag_id);

create table public.news_source_runs (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid not null references public.news_sources(id) on delete cascade,
  trigger      text not null default 'schedule' check (trigger in ('schedule','manual')),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'running' check (status in ('running','success','partial','failed','skipped')),
  fetched      int not null default 0,
  inserted     int not null default 0,
  duplicates   int not null default 0,
  queued_for_review int not null default 0,
  error        text
);
create index news_source_runs_source_idx on public.news_source_runs (source_id, started_at desc);

create table public.news_source_errors (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid not null references public.news_sources(id) on delete cascade,
  run_id       uuid references public.news_source_runs(id) on delete cascade,
  http_status  int,
  message      text not null,
  occurred_at  timestamptz not null default now()
);
create index news_source_errors_source_idx on public.news_source_errors (source_id, occurred_at desc);

create table public.editorial_revisions (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.news_articles(id) on delete cascade,
  editor_id   uuid references public.profiles(id) on delete set null,
  snapshot    jsonb not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index editorial_revisions_article_idx on public.editorial_revisions (article_id, created_at desc);

create table public.banner_prompts (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null check (char_length(title) between 3 and 200),
  prompt_text         text not null check (char_length(prompt_text) between 10 and 8000),
  preview_image_url   text,
  category            text not null default 'broker_news' check (category in
                        ('broker_news','trading_news','gold','forex','crypto','market_events','broker_promotions','financial_education','economic_news')),
  tags                text[] not null default '{}',
  aspect_ratio        text not null default '1:1' check (aspect_ratio in ('1:1','4:5','9:16','16:9')),
  language            text not null default 'en' check (language in ('en','ur','roman_ur','hi','ar')),
  related_article_id  uuid references public.news_articles(id) on delete set null,
  publish_date        date not null default (now() at time zone 'utc')::date,
  status              text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  published_at        timestamptz,
  scheduled_at        timestamptz,
  is_featured         boolean not null default false,
  access_level        text not null default 'members' check (access_level in ('public','members')),
  copy_enabled        boolean not null default true,
  is_sample           boolean not null default false,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index banner_prompts_public_idx on public.banner_prompts (status, publish_date desc);
create trigger banner_prompts_updated_at before update on public.banner_prompts
  for each row execute function public.set_updated_at();

create table public.video_scripts (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null check (char_length(title) between 3 and 200),
  topic               text,
  hook                text not null,
  body                text not null,
  closing             text,
  cta                 text,
  duration_seconds    int not null default 40 check (duration_seconds in (15,30,40,60,90,120)),
  language            text not null default 'en' check (language in ('en','ur','roman_ur','hi','ar')),
  related_article_id  uuid references public.news_articles(id) on delete set null,
  publish_date        date not null default (now() at time zone 'utc')::date,
  status              text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  published_at        timestamptz,
  scheduled_at        timestamptz,
  is_featured         boolean not null default false,
  access_level        text not null default 'members' check (access_level in ('public','members')),
  copy_enabled        boolean not null default true,
  is_sample           boolean not null default false,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index video_scripts_public_idx on public.video_scripts (status, publish_date desc);
create trigger video_scripts_updated_at before update on public.video_scripts
  for each row execute function public.set_updated_at();

-- Reports from users ("Report incorrect information" / "Report issue")
create table public.content_reports (
  id            uuid primary key default gen_random_uuid(),
  content_type  text not null check (content_type in ('article','banner_prompt','video_script','broker')),
  content_id    uuid not null,
  user_id       uuid references public.profiles(id) on delete set null,
  reason        text not null check (reason in ('incorrect','outdated','broken_link','copyright','inappropriate','other')),
  details       text check (char_length(details) <= 2000),
  status        text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at    timestamptz not null default now()
);
create index content_reports_status_idx on public.content_reports (status, created_at desc);

-- Publication guard: only staff with news.publish may publish/schedule/unpublish.
create or replace function public.guard_news_publication()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted_backend() then
    if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
    return new;
  end if;
  if (tg_op = 'INSERT' and new.status in ('published','scheduled'))
     or (tg_op = 'UPDATE' and new.status is distinct from old.status
         and (new.status in ('published','scheduled') or old.status in ('published','scheduled'))) then
    if not public.has_permission('news.publish') then
      raise exception 'Missing permission news.publish' using errcode = '42501';
    end if;
  end if;
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  if new.status = 'scheduled' and new.scheduled_at is null then
    raise exception 'Scheduled articles need a scheduled_at time' using errcode = '23514';
  end if;
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then new.created_by := coalesce(new.created_by, auth.uid()); end if;
  return new;
end $$;
create trigger news_articles_guard before insert or update on public.news_articles
  for each row execute function public.guard_news_publication();

create or replace function public.content_publish_defaults()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  if new.status = 'scheduled' and new.scheduled_at is null then
    raise exception 'Scheduled content needs a scheduled_at time' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger banner_prompts_publish before insert or update on public.banner_prompts
  for each row execute function public.content_publish_defaults();
create trigger video_scripts_publish before insert or update on public.video_scripts
  for each row execute function public.content_publish_defaults();

-- Store an editorial revision on each meaningful update.
create or replace function public.record_editorial_revision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (old.title, old.summary, old.content, old.status, old.priority)
     is distinct from (new.title, new.summary, new.content, new.status, new.priority) then
    insert into public.editorial_revisions (article_id, editor_id, snapshot)
    values (old.id, auth.uid(), jsonb_build_object(
      'title', old.title, 'summary', old.summary, 'content', old.content,
      'status', old.status, 'priority', old.priority, 'key_highlights', old.key_highlights));
  end if;
  return new;
end $$;
create trigger news_articles_revision after update on public.news_articles
  for each row execute function public.record_editorial_revision();

-- ---------- reference data: categories ----------
insert into public.news_categories (slug, name, news_type, icon, sort_order, show_on_home, home_description) values
  ('broker-news',            'Broker News',              'broker',  'megaphone',     10, true,  'Latest announcements from global brokers'),
  ('promotions-bonuses',     'Promotions & Bonuses',     'broker',  'gift',          20, true,  'Ongoing offers, deposit bonuses and campaigns'),
  ('regulatory-updates',     'Regulatory Updates',       'broker',  'shield-check',  30, true,  'Licenses, compliance and official alerts'),
  ('broker-reviews',         'Broker Reviews',           'broker',  'scale',         40, true,  'In-depth reviews, spreads and key comparisons'),
  ('ib-affiliate',           'IB & Affiliate',           'broker',  'users',         50, true,  'IB programs, commissions and partnership updates'),
  ('scam-alerts',            'Scam Alerts',              'broker',  'bell',          60, true,  'Stay informed about suspicious brokers'),
  ('broker-announcements',   'Broker Announcements',     'broker',  'newspaper',     70, false, null),
  ('broker-partnerships',    'Broker Partnerships',      'broker',  'handshake',     80, false, null),
  ('trading-volume-reports', 'Trading Volume Reports',   'broker',  'bar-chart',     90, false, null),
  ('broker-events',          'Broker Events',            'broker',  'calendar',     100, false, null),
  ('new-trading-products',   'New Trading Products',     'broker',  'package',      110, false, null),
  ('platform-updates',       'Platform Updates',         'broker',  'monitor',      120, false, null),
  ('deposit-withdrawal',     'Deposit & Withdrawal Updates','broker','wallet',      130, false, null),
  ('broker-expansions',      'Broker Expansions',        'broker',  'globe',        140, false, null),
  ('executive-appointments', 'Executive Appointments',   'broker',  'user-check',   150, false, null),
  ('corporate-acquisitions', 'Corporate Acquisitions',   'broker',  'building',     160, false, null),
  ('broker-awards',          'Broker Awards',            'broker',  'award',        170, false, null),
  ('technology-updates',     'Technology Updates',       'broker',  'cpu',          180, false, null),
  ('market-news',            'Market News',              'trading', 'trending-up',  200, false, null),
  ('market-analysis',        'Market Analysis',          'trading', 'line-chart',   210, false, null);
