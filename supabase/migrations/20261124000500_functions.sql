-- =====================================================================
-- 0005 Functions: rate limiting, analytics ingestion & aggregation,
-- rankings, segments, notifications, jobs, audit.
-- =====================================================================

-- ---------- settings helper ----------
create or replace function public.setting_json(p_key text, p_default jsonb default '{}'::jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.website_settings where key = p_key), p_default)
$$;

-- ---------- rate limiting (fixed window, works across serverless instances) ----------
create or replace function public.rate_limit_hit(p_key text, p_window_seconds int, p_max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;
  return v_hits <= p_max;
end $$;

-- ---------- audit ----------
create or replace function public.log_admin_action(
  p_action text, p_resource text, p_resource_id text default null,
  p_summary jsonb default '{}'::jsonb, p_result text default 'success')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_staff() or public.is_trusted_backend()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.admin_audit_logs (actor_id, actor_email, action, resource, resource_id, summary, result)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()),
          left(p_action, 80), left(p_resource, 80), left(p_resource_id, 120), coalesce(p_summary, '{}'::jsonb), p_result);
end $$;

-- ---------- first super admin (run once from SQL editor / service role) ----------
create or replace function public.bootstrap_super_admin(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if exists (select 1 from public.user_roles where role_key = 'super_admin') then
    raise exception 'A Super Admin already exists. Use the admin panel to assign roles.';
  end if;
  select id into v_id from public.profiles where lower(email) = lower(p_email);
  if v_id is null then raise exception 'No registered user with email %', p_email; end if;
  insert into public.user_roles (user_id, role_key) values (v_id, 'super_admin') on conflict do nothing;
  insert into public.admin_audit_logs (actor_id, actor_email, action, resource, resource_id, summary)
  values (null, 'system', 'bootstrap_super_admin', 'user_roles', v_id::text, jsonb_build_object('email', p_email));
  return 'Super Admin granted to ' || p_email;
end $$;

-- =====================================================================
-- Analytics ingestion
-- =====================================================================

-- p_session: {id, user_id, visitor_id, landing_path, referrer_host, traffic_source, utm_*, device_category, browser, os, country}
-- p_events:  [{event_id, event_name, feature, content_type, content_id, path, engaged_seconds, metadata, dedupe_key, occurred_at}]
create or replace function public.analytics_ingest(p_session jsonb, p_events jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_sid uuid := (p_session->>'id')::uuid;
  v_uid uuid := nullif(p_session->>'user_id', '')::uuid;
  v_vid text := nullif(p_session->>'visitor_id', '');
  v_inserted int := 0;
  v_pv int := 0;
  v_new boolean;
begin
  if v_sid is null then return 0; end if;

  if not exists (select 1 from public.analytics_sessions where id = v_sid) then
    v_new := not exists (
      select 1 from public.analytics_sessions s
      where (v_uid is not null and s.user_id = v_uid) or (v_vid is not null and s.visitor_id = v_vid));
    insert into public.analytics_sessions (id, user_id, visitor_id, landing_path, exit_path, referrer_host, traffic_source,
      utm_source, utm_medium, utm_campaign, device_category, browser, os, country, is_new_visitor)
    values (v_sid, v_uid, v_vid, left(p_session->>'landing_path', 300), left(p_session->>'landing_path', 300),
      left(p_session->>'referrer_host', 200), coalesce(nullif(p_session->>'traffic_source', ''), 'direct'),
      left(p_session->>'utm_source', 100), left(p_session->>'utm_medium', 100), left(p_session->>'utm_campaign', 100),
      coalesce(nullif(p_session->>'device_category', ''), 'unknown'), left(p_session->>'browser', 40),
      left(p_session->>'os', 40), left(p_session->>'country', 2), v_new)
    on conflict (id) do nothing;
  elsif v_uid is not null then
    -- a guest session that logs in becomes attributed to the member
    update public.analytics_sessions set user_id = v_uid where id = v_sid and user_id is null;
  end if;

  with src as (
    select e from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) e limit 50
  ), ins as (
    insert into public.analytics_events (event_id, event_name, user_id, session_id, visitor_id, feature, content_type,
      content_id, path, engaged_seconds, device_category, referrer_host, country, metadata, dedupe_key, occurred_at)
    select (e->>'event_id')::uuid, e->>'event_name', v_uid, v_sid, v_vid,
      left(e->>'feature', 60), left(e->>'content_type', 40), nullif(e->>'content_id', '')::uuid,
      left(e->>'path', 300), nullif(e->>'engaged_seconds', '')::int,
      p_session->>'device_category', left(p_session->>'referrer_host', 200), left(p_session->>'country', 2),
      coalesce(e->'metadata', '{}'::jsonb), nullif(e->>'dedupe_key', ''),
      least(now(), greatest(now() - interval '1 day', coalesce(nullif(e->>'occurred_at', '')::timestamptz, now())))
    from src
    on conflict do nothing
    returning event_name, content_id
  ), counted as (
    select count(*) as n, count(*) filter (where event_name = 'page_view') as pv from ins
  ), views as (
    update public.news_articles a set view_count = a.view_count + 1
    where a.id in (select content_id from ins where event_name = 'article_open' and content_id is not null)
    returning 1
  )
  select n, pv into v_inserted, v_pv from counted;

  update public.analytics_sessions
     set events = events + v_inserted, page_views = page_views + v_pv, last_seen_at = now()
   where id = v_sid;
  return v_inserted;
end $$;

-- Presence heartbeat. One presence row per person (user or anonymous visitor) so
-- multiple tabs never double count. Engaged seconds are only accepted from a visible,
-- recently-interacted tab and are capped to the heartbeat interval.
create or replace function public.analytics_heartbeat(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_key text := p->>'presence_key';
  v_uid uuid := nullif(p->>'user_id', '')::uuid;
  v_sid uuid := nullif(p->>'session_id', '')::uuid;
  v_tab text := left(coalesce(p->>'tab_id', 'tab'), 40);
  v_visible boolean := coalesce((p->>'visible')::boolean, false);
  v_interacted boolean := coalesce((p->>'interacted')::boolean, false);
  v_interval int := least(greatest(coalesce((p->>'interval_seconds')::int, 45), 15), 120);
  v_idle int := least(greatest(coalesce((p->>'idle_seconds')::int, 120), 30), 1800);
  v_delta int := 0;
  v_now timestamptz := now();
  v_today date := (now() at time zone 'utc')::date;
  v_session_start timestamptz;
begin
  if v_key is null or v_key !~ '^(u|a):[a-zA-Z0-9_-]{8,64}$' then
    return jsonb_build_object('ok', false);
  end if;
  if v_visible and v_interacted then
    v_delta := least(greatest(coalesce((p->>'engaged_delta')::int, 0), 0), v_interval + 15);
  end if;

  if v_sid is not null then
    update public.analytics_sessions
       set last_seen_at = v_now,
           engaged_seconds = engaged_seconds + v_delta,
           exit_path = case when v_visible then coalesce(left(p->>'path', 300), exit_path) else exit_path end,
           user_id = coalesce(user_id, v_uid)
     where id = v_sid
     returning started_at into v_session_start;
  end if;

  insert into public.visitor_presence as vp (presence_key, user_id, session_id, current_path, current_feature, state,
      session_started_at, last_heartbeat_at, last_interaction_at, device_category, browser, country, traffic_source, open_tabs)
  values (v_key, v_uid, v_sid, left(p->>'path', 300), left(p->>'feature', 60),
      case when v_interacted then 'active' else 'idle' end,
      coalesce(v_session_start, v_now), v_now, case when v_interacted then v_now end,
      left(p->>'device_category', 20), left(p->>'browser', 40), left(p->>'country', 2), left(p->>'traffic_source', 20),
      jsonb_build_object(v_tab, extract(epoch from v_now)::bigint))
  on conflict (presence_key) do update set
      user_id = coalesce(excluded.user_id, vp.user_id),
      session_id = case when v_visible or vp.session_id is null then excluded.session_id else vp.session_id end,
      session_started_at = case when vp.last_heartbeat_at < v_now - make_interval(secs => v_interval * 3)
                                then coalesce(v_session_start, v_now) else vp.session_started_at end,
      current_path = case when v_visible then excluded.current_path else vp.current_path end,
      current_feature = case when v_visible then excluded.current_feature else vp.current_feature end,
      last_heartbeat_at = v_now,
      last_interaction_at = case when v_interacted then v_now else vp.last_interaction_at end,
      state = case when (case when v_interacted then v_now else vp.last_interaction_at end) > v_now - make_interval(secs => v_idle)
                   then 'active' else 'idle' end,
      open_tabs = (select coalesce(jsonb_object_agg(k, val), '{}'::jsonb)
                   from jsonb_each(vp.open_tabs) t(k, val)
                   where (val)::bigint > extract(epoch from v_now)::bigint - v_interval * 3)
                  || jsonb_build_object(v_tab, extract(epoch from v_now)::bigint);

  if v_uid is not null then
    insert into public.daily_user_activity as d (user_id, day, engaged_seconds, first_seen_at, last_seen_at)
    values (v_uid, v_today, v_delta, v_now, v_now)
    on conflict (user_id, day) do update set
      engaged_seconds = d.engaged_seconds + excluded.engaged_seconds,
      last_seen_at = v_now;
    update public.profiles set last_active_at = v_now
     where id = v_uid and (last_active_at is null or last_active_at < v_now - interval '1 minute');
  end if;

  return jsonb_build_object('ok', true, 'accepted_seconds', v_delta);
end $$;

-- Mark presence rows that missed heartbeats as gone.
create or replace function public.analytics_prune_presence(p_offline_seconds int default 150)
returns int language sql security definer set search_path = public as $$
  with d as (delete from public.visitor_presence where last_heartbeat_at < now() - make_interval(secs => p_offline_seconds) returning 1)
  select count(*)::int from d
$$;

-- =====================================================================
-- Aggregation
-- =====================================================================
create or replace function public.analytics_rollup_day(p_day date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_from timestamptz := p_day::timestamp at time zone 'UTC';
  v_to   timestamptz := (p_day + 1)::timestamp at time zone 'UTC';
  w jsonb := public.setting_json('analytics.engagement_weights', '{}'::jsonb);
  w_day numeric := coalesce((w->>'active_day')::numeric, 5);
  w_min numeric := coalesce((w->>'engaged_minute')::numeric, 1);
  c_min int := coalesce((w->>'engaged_minutes_cap')::int, 60);
  w_art numeric := coalesce((w->>'article_read')::numeric, 2);
  c_art int := coalesce((w->>'articles_cap')::int, 25);
  w_pc numeric := coalesce((w->>'prompt_copy')::numeric, 5);
  c_pc int := coalesce((w->>'prompt_copies_cap')::int, 10);
  w_sc numeric := coalesce((w->>'script_copy')::numeric, 5);
  c_sc int := coalesce((w->>'script_copies_cap')::int, 10);
  w_ai numeric := coalesce((w->>'ai_generation')::numeric, 8);
  c_ai int := coalesce((w->>'ai_generations_cap')::int, 10);
  w_sv numeric := coalesce((w->>'content_saved')::numeric, 3);
  c_sv int := coalesce((w->>'saves_cap')::int, 10);
  v_min_active int := coalesce((w->>'min_active_seconds')::int, 60);
  v_users int;
begin
  -- per-user activity
  insert into public.daily_user_activity as d (user_id, day, sessions, page_views, articles_read, broker_articles_read,
    trading_articles_read, prompts_viewed, prompts_copied, scripts_viewed, scripts_copied, ai_generations, content_saved,
    notifications_opened, external_clicks, first_seen_at, last_seen_at)
  select e.user_id, p_day,
    (select count(*) from public.analytics_sessions s where s.user_id = e.user_id and s.started_at >= v_from and s.started_at < v_to),
    count(*) filter (where event_name = 'page_view'),
    count(distinct content_id) filter (where event_name = 'article_engaged'),
    count(distinct content_id) filter (where event_name = 'article_engaged' and metadata->>'news_type' = 'broker'),
    count(distinct content_id) filter (where event_name = 'article_engaged' and metadata->>'news_type' = 'trading'),
    count(distinct content_id) filter (where event_name = 'banner_prompt_view'),
    count(distinct content_id) filter (where event_name = 'banner_prompt_copy'),
    count(distinct content_id) filter (where event_name = 'video_script_view'),
    count(distinct content_id) filter (where event_name = 'video_script_copy'),
    count(*) filter (where event_name = 'ai_generation_completed'),
    count(distinct (content_type, content_id)) filter (where event_name in ('news_saved','banner_prompt_save','video_script_save','ai_output_save','content_saved')),
    count(*) filter (where event_name = 'notification_open'),
    count(*) filter (where event_name in ('external_link_click','dott_plus_click','facebook_click','linkedin_click','source_link_click')),
    min(occurred_at), max(occurred_at)
  from public.analytics_events e
  where e.user_id is not null and e.occurred_at >= v_from and e.occurred_at < v_to
  group by e.user_id
  on conflict (user_id, day) do update set
    sessions = excluded.sessions, page_views = excluded.page_views, articles_read = excluded.articles_read,
    broker_articles_read = excluded.broker_articles_read, trading_articles_read = excluded.trading_articles_read,
    prompts_viewed = excluded.prompts_viewed, prompts_copied = excluded.prompts_copied,
    scripts_viewed = excluded.scripts_viewed, scripts_copied = excluded.scripts_copied,
    ai_generations = excluded.ai_generations, content_saved = excluded.content_saved,
    notifications_opened = excluded.notifications_opened, external_clicks = excluded.external_clicks,
    first_seen_at = least(d.first_seen_at, excluded.first_seen_at),
    last_seen_at = greatest(d.last_seen_at, excluded.last_seen_at);

  update public.daily_user_activity d set
    is_active_day = (d.engaged_seconds >= v_min_active or d.articles_read > 0 or d.prompts_copied > 0
                     or d.scripts_copied > 0 or d.ai_generations > 0 or d.content_saved > 0),
    score = (case when (d.engaged_seconds >= v_min_active or d.articles_read > 0 or d.prompts_copied > 0
                        or d.scripts_copied > 0 or d.ai_generations > 0 or d.content_saved > 0) then w_day else 0 end)
          + least(d.engaged_seconds / 60, c_min) * w_min
          + least(d.articles_read, c_art) * w_art
          + least(d.prompts_copied, c_pc) * w_pc
          + least(d.scripts_copied, c_sc) * w_sc
          + least(d.ai_generations, c_ai) * w_ai
          + least(d.content_saved, c_sv) * w_sv
  where d.day = p_day;
  get diagnostics v_users = row_count;

  -- site-wide daily summary
  insert into public.daily_analytics_summary as s (day, unique_visitors, guest_visitors, registered_visitors, new_visitors,
    returning_visitors, sessions, engaged_sessions, bounces, page_views, engaged_seconds, registrations, articles_read,
    prompts_copied, scripts_copied, ai_generations, updated_at)
  select p_day,
    count(distinct coalesce(user_id::text, visitor_id, id::text)),
    count(distinct coalesce(visitor_id, id::text)) filter (where user_id is null),
    count(distinct user_id),
    count(distinct coalesce(user_id::text, visitor_id, id::text)) filter (where is_new_visitor),
    count(distinct coalesce(user_id::text, visitor_id, id::text)) filter (where not is_new_visitor),
    count(*),
    count(*) filter (where engaged_seconds >= 10 or page_views >= 2),
    count(*) filter (where page_views <= 1 and engaged_seconds < 10),
    coalesce(sum(page_views), 0), coalesce(sum(engaged_seconds), 0),
    (select count(*) from public.profiles p where p.created_at >= v_from and p.created_at < v_to),
    (select count(distinct (user_id, session_id, content_id)) from public.analytics_events where event_name = 'article_engaged' and occurred_at >= v_from and occurred_at < v_to),
    (select count(*) from public.analytics_events where event_name = 'banner_prompt_copy' and occurred_at >= v_from and occurred_at < v_to),
    (select count(*) from public.analytics_events where event_name = 'video_script_copy' and occurred_at >= v_from and occurred_at < v_to),
    (select count(*) from public.analytics_events where event_name = 'ai_generation_completed' and occurred_at >= v_from and occurred_at < v_to),
    now()
  from public.analytics_sessions where started_at >= v_from and started_at < v_to
  on conflict (day) do update set
    unique_visitors = excluded.unique_visitors, guest_visitors = excluded.guest_visitors,
    registered_visitors = excluded.registered_visitors, new_visitors = excluded.new_visitors,
    returning_visitors = excluded.returning_visitors, sessions = excluded.sessions,
    engaged_sessions = excluded.engaged_sessions, bounces = excluded.bounces, page_views = excluded.page_views,
    engaged_seconds = excluded.engaged_seconds, registrations = excluded.registrations,
    articles_read = excluded.articles_read, prompts_copied = excluded.prompts_copied,
    scripts_copied = excluded.scripts_copied, ai_generations = excluded.ai_generations, updated_at = now();

  -- per-content daily summary
  insert into public.content_analytics_summary as c (content_type, content_id, day, views, unique_viewers, registered_views,
    guest_views, engaged_seconds, copies, unique_copiers, saves, shares, ai_actions, last_accessed_at)
  select e.content_type, e.content_id, p_day,
    count(*) filter (where event_name in ('article_open','banner_prompt_view','video_script_view','broker_view')),
    count(distinct coalesce(user_id::text, visitor_id, session_id::text)) filter (where event_name in ('article_open','banner_prompt_view','video_script_view','broker_view')),
    count(*) filter (where user_id is not null and event_name in ('article_open','banner_prompt_view','video_script_view','broker_view')),
    count(*) filter (where user_id is null and event_name in ('article_open','banner_prompt_view','video_script_view','broker_view')),
    coalesce(sum(engaged_seconds) filter (where event_name = 'article_engaged'), 0),
    count(*) filter (where event_name in ('banner_prompt_copy','video_script_copy')),
    count(distinct coalesce(user_id::text, session_id::text)) filter (where event_name in ('banner_prompt_copy','video_script_copy')),
    count(*) filter (where event_name in ('news_saved','banner_prompt_save','video_script_save','content_saved')),
    count(*) filter (where event_name in ('news_shared','share_click')),
    count(*) filter (where event_name = 'ai_generation_requested'),
    max(occurred_at)
  from public.analytics_events e
  where e.content_id is not null and e.content_type in ('article','banner_prompt','video_script','broker')
    and e.occurred_at >= v_from and e.occurred_at < v_to
  group by e.content_type, e.content_id
  on conflict (content_type, content_id, day) do update set
    views = excluded.views, unique_viewers = excluded.unique_viewers, registered_views = excluded.registered_views,
    guest_views = excluded.guest_views, engaged_seconds = excluded.engaged_seconds, copies = excluded.copies,
    unique_copiers = excluded.unique_copiers, saves = excluded.saves, shares = excluded.shares,
    ai_actions = excluded.ai_actions, last_accessed_at = excluded.last_accessed_at;

  return jsonb_build_object('day', p_day, 'users_scored', v_users);
end $$;

create or replace function public.refresh_engagement_scores()
returns int language plpgsql security definer set search_path = public as $$
declare v_n int; v_today date := (now() at time zone 'utc')::date;
begin
  with agg as (
    select user_id,
      sum(score) as total, sum(score) filter (where day > v_today - 7) as s7, sum(score) filter (where day > v_today - 30) as s30,
      count(*) filter (where is_active_day) as active_days, max(day) filter (where is_active_day) as last_active
    from public.daily_user_activity group by user_id
  ), islands as (
    select user_id, day - (row_number() over (partition by user_id order by day))::int as grp, day
    from public.daily_user_activity where is_active_day
  ), runs as (
    select user_id, count(*) as len, max(day) as end_day from islands group by user_id, grp
  ), streaks as (
    select user_id, max(len) as longest,
      coalesce(max(len) filter (where end_day >= v_today - 1), 0) as current_streak
    from runs group by user_id
  ), ranked as (
    select a.*, coalesce(s.longest, 0) as longest, coalesce(s.current_streak, 0) as current_streak,
      rank() over (order by a.total desc) as rnk
    from agg a left join streaks s using (user_id)
  )
  insert into public.user_engagement_scores as u (user_id, total_score, score_7d, score_30d, active_days, current_streak,
    longest_streak, last_active_day, rank_all_time, previous_rank, updated_at)
  select user_id, coalesce(total, 0), coalesce(s7, 0), coalesce(s30, 0), active_days, current_streak, longest, last_active, rnk, null, now()
  from ranked
  on conflict (user_id) do update set
    previous_rank = u.rank_all_time, total_score = excluded.total_score, score_7d = excluded.score_7d,
    score_30d = excluded.score_30d, active_days = excluded.active_days, current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak, last_active_day = excluded.last_active_day,
    rank_all_time = excluded.rank_all_time, updated_at = now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Keep today's aggregates fresh without hammering the database (at most every 5 minutes).
create or replace function public.ensure_today_rollup()
returns void language plpgsql security definer set search_path = public as $$
declare v_today date := (now() at time zone 'utc')::date;
begin
  if not exists (select 1 from public.daily_analytics_summary where day = v_today and updated_at > now() - interval '5 minutes') then
    perform public.analytics_rollup_day(v_today);
    perform public.refresh_engagement_scores();
  end if;
end $$;

-- =====================================================================
-- Admin analytics read functions (permission-checked)
-- =====================================================================
create or replace function public.assert_permission(p text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_permission(p) or public.is_trusted_backend()) then
    raise exception 'Missing permission %', p using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_overview_stats(p_online_seconds int default 150)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  t0 timestamptz := v_today::timestamp at time zone 'UTC';
  r jsonb;
begin
  perform public.assert_permission('dashboard.view');
  perform public.ensure_today_rollup();
  select jsonb_build_object(
    'users', jsonb_build_object(
      'total', (select count(*) from profiles where status <> 'deleted'),
      'today', (select count(*) from profiles where created_at >= t0),
      'yesterday', (select count(*) from profiles where created_at >= t0 - interval '1 day' and created_at < t0),
      'week', (select count(*) from profiles where created_at >= date_trunc('week', now())),
      'month', (select count(*) from profiles where created_at >= date_trunc('month', now())),
      'verified', (select count(*) from profiles where email_verified_at is not null),
      'unverified', (select count(*) from profiles where email_verified_at is null),
      'suspended', (select count(*) from profiles where status = 'suspended'),
      'online_registered', (select count(*) from visitor_presence where user_id is not null and last_heartbeat_at > now() - make_interval(secs => p_online_seconds)),
      'online_guests', (select count(*) from visitor_presence where user_id is null and last_heartbeat_at > now() - make_interval(secs => p_online_seconds)),
      'dau', (select count(*) from daily_user_activity where day = v_today and is_active_day),
      'wau', (select count(distinct user_id) from daily_user_activity where day > v_today - 7 and is_active_day),
      'mau', (select count(distinct user_id) from daily_user_activity where day > v_today - 30 and is_active_day),
      'returning_30d', (select count(*) from (select user_id from daily_user_activity where day > v_today - 30 and is_active_day group by user_id having count(*) >= 2) x),
      'inactive_30d', (select count(*) from profiles p where status = 'active' and not exists (
                          select 1 from daily_user_activity d where d.user_id = p.id and d.day > v_today - 30 and d.is_active_day))),
    'engagement', jsonb_build_object(
      'page_views', (select coalesce(sum(page_views), 0) from daily_analytics_summary),
      'sessions', (select coalesce(sum(sessions), 0) from daily_analytics_summary),
      'avg_session_seconds', (select coalesce(round(avg(engaged_seconds)), 0) from analytics_sessions where started_at > now() - interval '30 days'),
      'avg_engaged_seconds_member_day', (select coalesce(round(avg(engaged_seconds)), 0) from daily_user_activity where day > v_today - 30 and is_active_day),
      'articles_read', (select coalesce(sum(articles_read), 0) from daily_analytics_summary),
      'prompts_viewed', (select count(*) from analytics_events where event_name = 'banner_prompt_view'),
      'prompts_copied', (select coalesce(sum(prompts_copied), 0) from daily_analytics_summary),
      'scripts_viewed', (select count(*) from analytics_events where event_name = 'video_script_view'),
      'scripts_copied', (select coalesce(sum(scripts_copied), 0) from daily_analytics_summary),
      'ai_generations', (select count(*) from ai_generations where status = 'completed'),
      'saved_content', (select count(*) from saved_content),
      'prompts_copied_today', (select count(*) from analytics_events where event_name = 'banner_prompt_copy' and occurred_at >= t0),
      'ai_generations_today', (select count(*) from ai_usage_logs where status = 'success' and created_at >= t0),
      'most_popular_broker', (select b.name from favourite_brokers f join brokers b on b.id = f.broker_id group by b.name order by count(*) desc limit 1),
      'most_popular_category', (select c.name from analytics_events e join news_articles a on a.id = e.content_id join news_categories c on c.id = a.category_id
                                where e.event_name = 'article_open' and e.occurred_at > now() - interval '30 days' group by c.name order by count(*) desc limit 1),
      'most_popular_feature', (select feature from analytics_events where feature is not null and occurred_at > now() - interval '30 days' group by feature order by count(*) desc limit 1)),
    'content', jsonb_build_object(
      'broker_published', (select count(*) from news_articles where news_type = 'broker' and status = 'published'),
      'trading_published', (select count(*) from news_articles where news_type = 'trading' and status = 'published'),
      'published_today', (select count(*) from news_articles where status = 'published' and published_at >= t0),
      'pending', (select count(*) from news_articles where status = 'pending_review'),
      'drafts', (select count(*) from news_articles where status = 'draft'),
      'scheduled', (select count(*) from news_articles where status = 'scheduled'),
      'featured', (select count(*) from news_articles where is_featured and status = 'published'),
      'banner_prompts', (select count(*) from banner_prompts where status = 'published'),
      'video_scripts', (select count(*) from video_scripts where status = 'published')),
    'system', jsonb_build_object(
      'sources_active', (select count(*) from news_sources where enabled),
      'sources_failed', (select count(*) from news_sources where enabled and consecutive_failures > 0),
      'last_news_refresh', (select max(last_success_at) from news_sources),
      'ai_requests_today', (select count(*) from ai_usage_logs where created_at >= t0),
      'ai_failed_today', (select count(*) from ai_usage_logs where created_at >= t0 and status <> 'success'),
      'errors_24h', (select count(*) from system_error_logs where created_at > now() - interval '24 hours' and level = 'error'),
      'jobs_failed', (select count(*) from scheduled_jobs where last_status = 'failed'))
  ) into r;
  return r;
end $$;

create or replace function public.analytics_timeseries(p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns table (bucket timestamptz, page_views bigint, sessions bigint, visitors bigint, registered bigint, engaged_seconds bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_permission('analytics.view');
  if p_bucket = 'hour' then
    if p_to - p_from > interval '14 days' then p_from := p_to - interval '14 days'; end if;
    return query
      select date_trunc('hour', s.started_at), coalesce(sum(s.page_views), 0)::bigint, count(*)::bigint,
        count(distinct coalesce(s.user_id::text, s.visitor_id, s.id::text))::bigint, count(distinct s.user_id)::bigint,
        coalesce(sum(s.engaged_seconds), 0)::bigint
      from analytics_sessions s where s.started_at >= p_from and s.started_at < p_to
      group by 1 order by 1;
  else
    return query
      select (date_trunc(case when p_bucket in ('week','month') then p_bucket else 'day' end, d.day::timestamp) at time zone 'UTC'),
        sum(d.page_views)::bigint, sum(d.sessions)::bigint, sum(d.unique_visitors)::bigint, sum(d.registered_visitors)::bigint,
        sum(d.engaged_seconds)::bigint
      from daily_analytics_summary d
      where d.day >= (p_from at time zone 'UTC')::date and d.day <= (p_to at time zone 'UTC')::date
      group by 1 order by 1;
  end if;
end $$;

create or replace function public.analytics_breakdown(p_from timestamptz, p_to timestamptz, p_dimension text, p_limit int default 15)
returns table (label text, sessions bigint, visitors bigint, page_views bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_permission('analytics.view');
  if p_dimension not in ('traffic_source','device_category','browser','os','country','landing_path','exit_path','referrer_host') then
    raise exception 'Unsupported dimension';
  end if;
  return query execute format(
    'select coalesce(%1$I, ''(unknown)'')::text, count(*)::bigint,
            count(distinct coalesce(user_id::text, visitor_id, id::text))::bigint, coalesce(sum(page_views),0)::bigint
       from public.analytics_sessions where started_at >= $1 and started_at < $2
      group by 1 order by 2 desc limit $3', p_dimension)
  using p_from, p_to, least(p_limit, 100);
end $$;

create or replace function public.analytics_top_pages(p_from timestamptz, p_to timestamptz, p_limit int default 20)
returns table (path text, views bigint, visitors bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_permission('analytics.view');
  if p_to - p_from > interval '93 days' then p_from := p_to - interval '93 days'; end if;
  return query
    select e.path, count(*)::bigint, count(distinct coalesce(e.user_id::text, e.visitor_id, e.session_id::text))::bigint
    from analytics_events e where e.event_name = 'page_view' and e.occurred_at >= p_from and e.occurred_at < p_to
    group by e.path order by 2 desc limit least(p_limit, 100);
end $$;

create or replace function public.analytics_heatmap(p_from timestamptz, p_to timestamptz)
returns table (dow int, hour int, sessions bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_permission('analytics.view');
  return query
    select extract(isodow from s.started_at at time zone 'UTC')::int, extract(hour from s.started_at at time zone 'UTC')::int, count(*)::bigint
    from analytics_sessions s where s.started_at >= p_from and s.started_at < p_to group by 1, 2;
end $$;

create or replace function public.analytics_feature_popularity(p_from timestamptz, p_to timestamptz)
returns table (feature text, events bigint, users bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_permission('analytics.view');
  if p_to - p_from > interval '93 days' then p_from := p_to - interval '93 days'; end if;
  return query
    select e.feature, count(*)::bigint, count(distinct e.user_id)::bigint
    from analytics_events e where e.feature is not null and e.occurred_at >= p_from and e.occurred_at < p_to
    group by e.feature order by 2 desc limit 20;
end $$;

-- Homepage → Sign Up → Email Verified → First Content Copy → First AI Generation
create or replace function public.analytics_funnel(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform public.assert_permission('analytics.view');
  with home as (
    select count(distinct coalesce(visitor_id, id::text)) n from analytics_sessions
    where started_at >= p_from and started_at < p_to and user_id is null and landing_path = '/'
  ), signups as (
    select id from profiles where created_at >= p_from and created_at < p_to
  ), verified as (
    select p.id from profiles p join signups s on s.id = p.id where p.email_verified_at is not null
  ), copied as (
    select distinct v.id from verified v join analytics_events e on e.user_id = v.id
    where e.event_name in ('banner_prompt_copy','video_script_copy','ai_output_copy')
  ), generated as (
    select distinct c.id from copied c join ai_generations g on g.user_id = c.id and g.status = 'completed'
  )
  select jsonb_build_array(
    jsonb_build_object('step', 'Homepage visitors (guests)', 'count', (select n from home)),
    jsonb_build_object('step', 'Signed up', 'count', (select count(*) from signups)),
    jsonb_build_object('step', 'Email verified', 'count', (select count(*) from verified)),
    jsonb_build_object('step', 'First content copy', 'count', (select count(*) from copied)),
    jsonb_build_object('step', 'First AI generation', 'count', (select count(*) from generated))) into r;
  return r;
end $$;

-- Day-N retention: share of users registered in the range who had an active day exactly N days after signup.
create or replace function public.analytics_retention(p_from date, p_to date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform public.assert_permission('analytics.view');
  with cohort as (
    select id, (created_at at time zone 'UTC')::date as d0 from profiles
    where (created_at at time zone 'UTC')::date between p_from and p_to
  )
  select jsonb_build_object(
    'cohort_size', (select count(*) from cohort),
    'eligible_d1', (select count(*) from cohort where d0 + 1 <= (now() at time zone 'utc')::date),
    'eligible_d7', (select count(*) from cohort where d0 + 7 <= (now() at time zone 'utc')::date),
    'eligible_d30', (select count(*) from cohort where d0 + 30 <= (now() at time zone 'utc')::date),
    'd1', (select count(*) from cohort c where exists (select 1 from daily_user_activity a where a.user_id = c.id and a.day = c.d0 + 1 and a.is_active_day)),
    'd7', (select count(*) from cohort c where exists (select 1 from daily_user_activity a where a.user_id = c.id and a.day = c.d0 + 7 and a.is_active_day)),
    'd30', (select count(*) from cohort c where exists (select 1 from daily_user_activity a where a.user_id = c.id and a.day = c.d0 + 30 and a.is_active_day))
  ) into r;
  return r;
end $$;

create or replace function public.compute_retention_cohorts(p_type text default 'week', p_count int default 8)
returns setof public.user_retention_cohorts language plpgsql security definer set search_path = public as $$
declare v_unit interval := case when p_type = 'month' then interval '1 month' else interval '1 week' end;
begin
  perform public.assert_permission('analytics.view');
  if p_type not in ('week','month') then raise exception 'Invalid cohort type'; end if;
  delete from user_retention_cohorts where cohort_type = p_type;
  insert into user_retention_cohorts (cohort_type, cohort_start, period, cohort_size, retained)
  with cohorts as (
    select id, date_trunc(p_type, created_at at time zone 'UTC')::date as cs from profiles
    where created_at >= date_trunc(p_type, now()) - v_unit * (p_count - 1)
  ), sizes as (select cs, count(*) n from cohorts group by cs),
  periods as (select generate_series(0, p_count - 1) as k)
  select p_type, s.cs, p.k, s.n,
    (select count(distinct c.id) from cohorts c join daily_user_activity a on a.user_id = c.id and a.is_active_day
      where c.cs = s.cs and a.day >= (s.cs + v_unit * p.k)::date and a.day < (s.cs + v_unit * (p.k + 1))::date)
  from sizes s cross join periods p
  where (s.cs + v_unit * p.k)::date <= (now() at time zone 'utc')::date;
  return query select * from user_retention_cohorts where cohort_type = p_type order by cohort_start, period;
end $$;

-- Leaderboards. Metric: score | engaged | articles | prompts | scripts | ai | saved | sessions | consistency
create or replace function public.get_leaderboard(
  p_from date, p_to date, p_metric text default 'score',
  p_country text default null, p_profession text default null, p_status text default null,
  p_limit int default 50, p_offset int default 0)
returns table (
  rank bigint, previous_rank bigint, user_id uuid, full_name text, profession text, country text,
  registered_at timestamptz, last_active_at timestamptz, active_days bigint, sessions bigint,
  engaged_seconds bigint, articles_read bigint, prompts_copied bigint, scripts_copied bigint,
  ai_generations bigint, content_saved bigint, score numeric, metric_value numeric)
language plpgsql security definer set search_path = public as $$
declare v_len int := p_to - p_from + 1;
begin
  perform public.assert_permission('analytics.view');
  if p_metric not in ('score','engaged','articles','prompts','scripts','ai','saved','sessions','consistency') then
    raise exception 'Unsupported metric';
  end if;
  if p_to >= (now() at time zone 'utc')::date then perform public.ensure_today_rollup(); end if;
  return query
  with cur as (
    select d.user_id, count(*) filter (where d.is_active_day) ad, sum(d.sessions) se, sum(d.engaged_seconds) es,
      sum(d.articles_read) ar, sum(d.prompts_copied) pc, sum(d.scripts_copied) sc, sum(d.ai_generations) ai,
      sum(d.content_saved) sv, sum(d.score) sco
    from daily_user_activity d where d.day between p_from and p_to group by d.user_id
  ), prev as (
    select d.user_id, sum(d.score) sco, sum(d.engaged_seconds) es, sum(d.articles_read) ar, sum(d.prompts_copied) pc,
      sum(d.scripts_copied) sc, sum(d.ai_generations) ai, sum(d.content_saved) sv, sum(d.sessions) se,
      count(*) filter (where d.is_active_day) ad
    from daily_user_activity d where v_len <= 400 and d.day between p_from - v_len and p_from - 1 group by d.user_id
  ), filt as (
    select p.id, p.full_name, p.profession, p.country, p.created_at, p.last_active_at from profiles p
    where (p_country is null or p.country = p_country) and (p_profession is null or p.profession = p_profession)
      and (p_status is null or p.status = p_status)
  ), metric as (
    select c.*, f.full_name, f.profession, f.country, f.created_at, f.last_active_at,
      (case p_metric when 'score' then c.sco when 'engaged' then c.es when 'articles' then c.ar when 'prompts' then c.pc
        when 'scripts' then c.sc when 'ai' then c.ai when 'saved' then c.sv when 'sessions' then c.se else c.ad end)::numeric mv
    from cur c join filt f on f.id = c.user_id
  ), prev_rank as (
    select pr.user_id, rank() over (order by (case p_metric when 'score' then pr.sco when 'engaged' then pr.es when 'articles' then pr.ar
        when 'prompts' then pr.pc when 'scripts' then pr.sc when 'ai' then pr.ai when 'saved' then pr.sv when 'sessions' then pr.se else pr.ad end) desc) pr
    from prev pr join filt f on f.id = pr.user_id
  )
  select rank() over (order by m.mv desc, m.sco desc), r.pr, m.user_id, m.full_name, m.profession, m.country,
    m.created_at, m.last_active_at, m.ad, m.se, m.es, m.ar, m.pc, m.sc, m.ai, m.sv, m.sco, m.mv
  from metric m left join prev_rank r on r.user_id = m.user_id
  where m.mv > 0
  order by m.mv desc, m.sco desc
  limit least(p_limit, 500) offset p_offset;
end $$;

create or replace function public.user_analytics_summary(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; v_today date := (now() at time zone 'utc')::date;
begin
  perform public.assert_permission('analytics.users');
  select jsonb_build_object(
    'sessions', (select count(*) from analytics_sessions where user_id = p_user),
    'visits_days', (select count(*) from daily_user_activity where user_id = p_user),
    'engaged_seconds', (select coalesce(sum(engaged_seconds), 0) from daily_user_activity where user_id = p_user),
    'avg_session_seconds', (select coalesce(round(avg(engaged_seconds)), 0) from analytics_sessions where user_id = p_user),
    'active_days', (select count(*) from daily_user_activity where user_id = p_user and is_active_day),
    'week_engaged', (select coalesce(sum(engaged_seconds), 0) from daily_user_activity where user_id = p_user and day > v_today - 7),
    'month_engaged', (select coalesce(sum(engaged_seconds), 0) from daily_user_activity where user_id = p_user and day > v_today - 30),
    'broker_articles', (select coalesce(sum(broker_articles_read), 0) from daily_user_activity where user_id = p_user),
    'trading_articles', (select coalesce(sum(trading_articles_read), 0) from daily_user_activity where user_id = p_user),
    'prompts_viewed', (select coalesce(sum(prompts_viewed), 0) from daily_user_activity where user_id = p_user),
    'prompts_copied', (select coalesce(sum(prompts_copied), 0) from daily_user_activity where user_id = p_user),
    'scripts_viewed', (select coalesce(sum(scripts_viewed), 0) from daily_user_activity where user_id = p_user),
    'scripts_copied', (select coalesce(sum(scripts_copied), 0) from daily_user_activity where user_id = p_user),
    'ai_generations', (select count(*) from ai_generations where user_id = p_user and status = 'completed'),
    'content_saved', (select count(*) from saved_content where user_id = p_user),
    'notifications_opened', (select coalesce(sum(notifications_opened), 0) from daily_user_activity where user_id = p_user),
    'external_clicks', (select coalesce(sum(external_clicks), 0) from daily_user_activity where user_id = p_user),
    'followed_brokers', (select coalesce(jsonb_agg(b.name order by b.name), '[]'::jsonb) from favourite_brokers f join brokers b on b.id = f.broker_id where f.user_id = p_user),
    'top_categories', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select c.name, count(*) n from analytics_events e join news_articles a on a.id = e.content_id
        join news_categories c on c.id = a.category_id where e.user_id = p_user and e.event_name = 'article_open'
        group by c.name order by n desc limit 5) x),
    'top_brokers', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select b.name, count(*) n from analytics_events e join brokers b on b.id = e.content_id
        where e.user_id = p_user and e.event_name = 'broker_view' group by b.name order by n desc limit 5) x),
    'score', (select to_jsonb(s) from user_engagement_scores s where s.user_id = p_user),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'engaged', engaged_seconds, 'score', score, 'active', is_active_day) order by day), '[]'::jsonb)
              from daily_user_activity where user_id = p_user and day > v_today - 90)
  ) into r;
  return r;
end $$;

create or replace function public.content_performance(p_type text, p_from date, p_to date, p_order text default 'views', p_limit int default 50)
returns table (content_id uuid, title text, published_at timestamptz, views bigint, unique_viewers bigint, registered_views bigint,
  guest_views bigint, engaged_seconds bigint, copies bigint, unique_copiers bigint, saves bigint, shares bigint,
  ai_actions bigint, last_accessed_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_permission('analytics.view');
  if p_order not in ('views','copies','saves','unique_viewers','shares') then p_order := 'views'; end if;
  return query execute format($q$
    with s as (
      select c.content_id, sum(c.views)::bigint v, sum(c.unique_viewers)::bigint uv, sum(c.registered_views)::bigint rv,
        sum(c.guest_views)::bigint gv, sum(c.engaged_seconds)::bigint es, sum(c.copies)::bigint cp, sum(c.unique_copiers)::bigint uc,
        sum(c.saves)::bigint sv, sum(c.shares)::bigint sh, sum(c.ai_actions)::bigint ai, max(c.last_accessed_at) la
      from public.content_analytics_summary c
      where c.content_type = $1 and c.day between $2 and $3 group by c.content_id)
    select s.content_id,
      coalesce(a.title, bp.title, vs.title, b.name, '(deleted)')::text,
      coalesce(a.published_at, bp.published_at, vs.published_at, b.created_at),
      s.v, s.uv, s.rv, s.gv, s.es, s.cp, s.uc, s.sv, s.sh, s.ai, s.la
    from s
    left join public.news_articles a on $1 = 'article' and a.id = s.content_id
    left join public.banner_prompts bp on $1 = 'banner_prompt' and bp.id = s.content_id
    left join public.video_scripts vs on $1 = 'video_script' and vs.id = s.content_id
    left join public.brokers b on $1 = 'broker' and b.id = s.content_id
    order by %s desc nulls last limit $4 $q$,
    case p_order when 'copies' then 's.cp' when 'saves' then 's.sv' when 'unique_viewers' then 's.uv' when 'shares' then 's.sh' else 's.v' end)
  using p_type, p_from, p_to, least(p_limit, 500);
end $$;

create or replace function public.broker_follower_stats()
returns table (broker_id uuid, name text, followers bigint, notify_enabled bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_permission('brokers.manage') or public.has_permission('analytics.view')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query select b.id, b.name, count(f.user_id), count(f.user_id) filter (where f.notify)
    from brokers b left join favourite_brokers f on f.broker_id = b.id group by b.id, b.name order by 3 desc;
end $$;

create or replace function public.get_live_visitors(p_online_seconds int default 150)
returns table (presence_key text, user_id uuid, full_name text, email text, state text, current_path text,
  current_feature text, session_started_at timestamptz, last_heartbeat_at timestamptz, last_interaction_at timestamptz,
  session_engaged_seconds int, today_engaged_seconds int, today_sessions int, device_category text, browser text,
  country text, traffic_source text, open_tabs int)
language plpgsql security definer set search_path = public as $$
declare v_pii boolean := public.has_permission('users.pii') or public.is_trusted_backend();
begin
  perform public.assert_permission('analytics.live');
  return query
  select v.presence_key, v.user_id, p.full_name,
    case when v_pii then p.email else null end,
    case when v.last_interaction_at > now() - interval '2 minutes' then 'active' else 'idle' end,
    v.current_path, v.current_feature, v.session_started_at, v.last_heartbeat_at, v.last_interaction_at,
    s.engaged_seconds, d.engaged_seconds, d.sessions, v.device_category, v.browser, v.country, v.traffic_source,
    (select count(*)::int from jsonb_object_keys(v.open_tabs))
  from visitor_presence v
  left join profiles p on p.id = v.user_id
  left join analytics_sessions s on s.id = v.session_id
  left join daily_user_activity d on d.user_id = v.user_id and d.day = (now() at time zone 'utc')::date
  where v.last_heartbeat_at > now() - make_interval(secs => p_online_seconds)
  order by v.user_id is null, v.last_interaction_at desc nulls last
  limit 500;
end $$;

-- =====================================================================
-- Segments
-- rules: {professions[], countries[], registered_after, registered_before, verified, active_within_days,
--         inactive_for_days, min_score_30d, preferred_market, follows_broker, feature, feature_min, marketing_consent}
-- =====================================================================
create or replace function public.segment_user_ids(p_rules jsonb)
returns table (user_id uuid) language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  r jsonb := coalesce(p_rules, '{}'::jsonb);
begin
  if not (public.has_permission('users.view') or public.has_permission('analytics.view')
          or public.has_permission('notifications.manage') or public.is_trusted_backend()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  select p.id from profiles p
  where p.status = 'active'
    and (jsonb_array_length(coalesce(r->'professions', '[]')) = 0 or p.profession in (select jsonb_array_elements_text(r->'professions')))
    and (jsonb_array_length(coalesce(r->'countries', '[]')) = 0 or p.country in (select jsonb_array_elements_text(r->'countries')))
    and (r->>'registered_within_days' is null or p.created_at > now() - make_interval(days => (r->>'registered_within_days')::int))
    and (r->>'registered_after' is null or p.created_at >= (r->>'registered_after')::timestamptz)
    and (r->>'registered_before' is null or p.created_at < (r->>'registered_before')::timestamptz)
    and (r->>'verified' is null or (p.email_verified_at is not null) = (r->>'verified')::boolean)
    and (r->>'active_within_days' is null or exists (select 1 from daily_user_activity d where d.user_id = p.id and d.is_active_day and d.day > v_today - (r->>'active_within_days')::int))
    and (r->>'inactive_for_days' is null or not exists (select 1 from daily_user_activity d where d.user_id = p.id and d.is_active_day and d.day > v_today - (r->>'inactive_for_days')::int))
    and (r->>'min_score_30d' is null or exists (select 1 from user_engagement_scores s where s.user_id = p.id and s.score_30d >= (r->>'min_score_30d')::numeric))
    and (r->>'preferred_market' is null or exists (select 1 from user_preferences up where up.user_id = p.id and (r->>'preferred_market') = any(up.market_categories)))
    and (r->>'follows_broker' is null or exists (select 1 from favourite_brokers f where f.user_id = p.id and f.broker_id = (r->>'follows_broker')::uuid))
    and (r->>'feature' is null or (
          select coalesce(sum(case r->>'feature' when 'prompts' then d.prompts_copied when 'scripts' then d.scripts_copied
                                   when 'ai' then d.ai_generations when 'articles' then d.articles_read else 0 end), 0)
          from daily_user_activity d where d.user_id = p.id and d.day > v_today - 30) >= coalesce((r->>'feature_min')::int, 1))
    and (r->>'marketing_consent' is null or (
          select c.granted from user_consents c where c.user_id = p.id and c.consent_type = 'marketing'
          order by c.created_at desc limit 1) is not distinct from (r->>'marketing_consent')::boolean);
end $$;

-- =====================================================================
-- Notifications fan-out (idempotent: unique (notification_id, user_id))
-- audience: {"type":"all"} | {"type":"segment","segment_id":..} | {"type":"broker_followers","broker_id":..}
--           | {"type":"market","market":..} | {"type":"user","user_id":..}
-- =====================================================================
create or replace function public.deliver_notification(p_notification uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n public.notifications; v_count int;
begin
  if not (public.has_permission('notifications.manage') or public.is_trusted_backend()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into n from public.notifications where id = p_notification for update;
  if n.id is null then raise exception 'Notification not found'; end if;
  if n.status = 'sent' then return n.recipients; end if;
  update public.notifications set status = 'sending' where id = n.id;

  insert into public.user_notifications (notification_id, user_id)
  select n.id, t.uid from (
    select p.id as uid from public.profiles p where p.status = 'active' and (n.audience->>'type') = 'all'
    union select s.user_id from public.segment_user_ids(
      (select rules from public.user_segments where id = nullif(n.audience->>'segment_id','')::uuid)) s
      where (n.audience->>'type') = 'segment'
    union select f.user_id from public.favourite_brokers f
      where (n.audience->>'type') = 'broker_followers' and f.broker_id = nullif(n.audience->>'broker_id','')::uuid and f.notify
    union select up.user_id from public.user_preferences up
      where (n.audience->>'type') = 'market' and (n.audience->>'market') = any(up.market_categories)
    union select nullif(n.audience->>'user_id','')::uuid where (n.audience->>'type') = 'user'
  ) t
  join public.notification_preferences np on np.user_id = t.uid
  where n.category = 'account' or (case n.category
      when 'breaking_broker' then np.breaking_broker when 'trading' then np.trading when 'new_prompt' then np.new_prompt
      when 'new_script' then np.new_script when 'followed_broker' then np.followed_broker else np.announcement end)
  on conflict (notification_id, user_id) do nothing;
  get diagnostics v_count = row_count;

  update public.notifications set status = 'sent', sent_at = now(),
    recipients = (select count(*) from public.user_notifications where notification_id = n.id)
  where id = n.id;
  return v_count;
end $$;

create or replace function public.notification_stats(p_notification uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.has_permission('notifications.manage') then jsonb_build_object(
    'delivered', count(*), 'read', count(*) filter (where read_at is not null), 'opened', count(*) filter (where opened_at is not null))
  else null end from public.user_notifications where notification_id = p_notification
$$;

-- =====================================================================
-- Jobs & scheduling (service role only)
-- =====================================================================
create or replace function public.try_lock_job(p_key text, p_seconds int default 300, p_force boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  update public.scheduled_jobs set locked_until = now() + make_interval(secs => p_seconds)
   where key = p_key and enabled and (locked_until is null or locked_until < now())
     and (p_force or next_run_at <= now())
  returning true into v_ok;
  return coalesce(v_ok, false);
end $$;

create or replace function public.release_job(p_key text, p_status text, p_error text default null)
returns void language sql security definer set search_path = public as $$
  update public.scheduled_jobs set locked_until = null, last_run_at = now(), last_status = p_status,
    last_error = left(p_error, 1000), next_run_at = now() + make_interval(mins => interval_minutes)
  where key = p_key
$$;

create or replace function public.claim_due_sources(p_limit int default 10, p_lock_seconds int default 120, p_source uuid default null)
returns setof public.news_sources language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.news_sources s set locked_until = now() + make_interval(secs => p_lock_seconds)
  where s.id in (
    select id from public.news_sources
    where ((p_source is not null and id = p_source)
       or (p_source is null and enabled and collection_permitted and next_run_at <= now()))
      and (locked_until is null or locked_until < now())
    order by priority desc, next_run_at
    limit p_limit for update skip locked)
  returning s.*;
end $$;

create or replace function public.publish_due_content()
returns jsonb language plpgsql security definer set search_path = public as $$
declare a int; b int; c int;
begin
  update public.news_articles set status = 'published', published_at = coalesce(scheduled_at, now())
   where status = 'scheduled' and scheduled_at <= now();
  get diagnostics a = row_count;
  update public.banner_prompts set status = 'published', published_at = coalesce(scheduled_at, now())
   where status = 'scheduled' and scheduled_at <= now();
  get diagnostics b = row_count;
  update public.video_scripts set status = 'published', published_at = coalesce(scheduled_at, now())
   where status = 'scheduled' and scheduled_at <= now();
  get diagnostics c = row_count;
  return jsonb_build_object('articles', a, 'prompts', b, 'scripts', c);
end $$;

create or replace function public.purge_analytics(p_event_days int default 90)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e int; s int; r int;
begin
  delete from public.analytics_events where occurred_at < now() - make_interval(days => greatest(p_event_days, 7));
  get diagnostics e = row_count;
  delete from public.analytics_sessions where started_at < now() - make_interval(days => greatest(p_event_days, 7));
  get diagnostics s = row_count;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics r = row_count;
  perform public.analytics_prune_presence(600);
  return jsonb_build_object('events', e, 'sessions', s, 'rate_limits', r);
end $$;

-- AI quota check used before each generation (service role).
create or replace function public.ai_quota_status(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  s public.ai_provider_settings;
  t0 timestamptz := (now() at time zone 'utc')::date::timestamp at time zone 'UTC';
  v_user_limit int; v_user_used int; v_day int; v_month int;
begin
  select * into s from public.ai_provider_settings where id = 1;
  select coalesce(p.ai_daily_limit, s.per_user_daily_limit) into v_user_limit from public.profiles p where p.id = p_user;
  select count(*) into v_user_used from public.ai_usage_logs where user_id = p_user and created_at >= t0 and status in ('success','failed','timeout');
  select count(*) into v_day from public.ai_usage_logs where created_at >= t0 and status = 'success';
  select count(*) into v_month from public.ai_usage_logs where created_at >= date_trunc('month', now()) and status = 'success';
  return jsonb_build_object('user_limit', coalesce(v_user_limit, 0), 'user_used', v_user_used,
    'global_day', v_day, 'global_day_limit', s.global_daily_limit,
    'global_month', v_month, 'global_month_limit', s.global_monthly_limit,
    'allowed', v_user_used < coalesce(v_user_limit, 0) and v_day < s.global_daily_limit and v_month < s.global_monthly_limit);
end $$;

-- ---------- execution privileges ----------
revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
revoke execute on function public.bootstrap_super_admin(text) from public, anon, authenticated;
revoke execute on function public.analytics_ingest(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.analytics_heartbeat(jsonb) from public, anon, authenticated;
revoke execute on function public.analytics_prune_presence(int) from public, anon, authenticated;
revoke execute on function public.analytics_rollup_day(date) from public, anon, authenticated;
revoke execute on function public.refresh_engagement_scores() from public, anon, authenticated;
revoke execute on function public.try_lock_job(text, int, boolean) from public, anon, authenticated;
revoke execute on function public.release_job(text, text, text) from public, anon, authenticated;
revoke execute on function public.claim_due_sources(int, int, uuid) from public, anon, authenticated;
revoke execute on function public.publish_due_content() from public, anon, authenticated;
revoke execute on function public.purge_analytics(int) from public, anon, authenticated;
revoke execute on function public.ai_quota_status(uuid) from public, anon, authenticated;
revoke execute on function public.setting_json(text, jsonb) from public, anon, authenticated;
-- ensure_today_rollup is invoked inside permission-checked SECURITY DEFINER functions only
revoke execute on function public.ensure_today_rollup() from public, anon, authenticated;
