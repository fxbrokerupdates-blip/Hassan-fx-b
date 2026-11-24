-- Database behaviour tests. Every block raises on failure (ON_ERROR_STOP=1).
\set QUIET on

-- ---------- fixtures ----------
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
 ('11111111-1111-4111-8111-111111111111', 'admin@test.local', '{"full_name":"Admin User","terms_accepted":true,"country":"PK","profession":"other"}', now()),
 ('22222222-2222-4222-8222-222222222222', 'alice@test.local', '{"full_name":"Alice Member","terms_accepted":true,"country":"AE","profession":"introducing_broker","marketing_consent":true,"phone_country_code":"+971","phone":"501234567"}', now()),
 ('33333333-3333-4333-8333-333333333333', 'bob@test.local',   '{"full_name":"Bob Member","terms_accepted":true,"country":"MY","profession":"content_creator"}', null),
 ('44444444-4444-4444-8444-444444444444', 'carol@test.local', '{"full_name":"Carol Creator","terms_accepted":true,"profession":"content_creator"}', now());

do $$ begin
  assert (select count(*) from profiles) = 4, 'profiles not created by trigger';
  assert (select count(*) from user_roles where role_key = 'member') = 4, 'member role not assigned';
  assert (select count(*) from newsletter_subscribers where email = 'alice@test.local') = 1, 'marketing opt-in not subscribed';
  assert (select count(*) from newsletter_subscribers where email = 'bob@test.local') = 0, 'subscribed without consent';
  assert (select count(*) from user_consents where consent_type = 'terms') = 4, 'terms consent missing';
end $$;

-- auth → profile sync must bypass the member column guard (verification + last login)
update auth.users set email_confirmed_at = now(), last_sign_in_at = now() where email = 'bob@test.local';
do $$ begin
  assert (select email_verified_at is not null and last_login_at is not null from profiles where email = 'bob@test.local'), 'auth sync blocked by profile guard';
end $$;

select public.bootstrap_super_admin('admin@test.local');
do $$ begin
  begin
    perform public.bootstrap_super_admin('alice@test.local');
    raise exception 'second bootstrap should fail';
  exception when others then
    if sqlerrm = 'second bootstrap should fail' then raise; end if;
  end;
end $$;
insert into user_roles (user_id, role_key) values ('44444444-4444-4444-8444-444444444444', 'content_creator');

-- ---------- member isolation ----------
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  assert (select count(*) from profiles) = 1, 'member can see other profiles';
  assert (select count(*) from analytics_events) = 0, 'member can read analytics';
  assert (select count(*) from admin_audit_logs) = 0, 'member can read audit logs';
  assert (select count(*) from news_articles where status <> 'published') = 0, 'member sees drafts';
  assert (select count(*) from news_articles) > 0, 'member cannot read published news';
  assert not public.has_permission('dashboard.view'), 'member has admin permission';
end $$;

update profiles set status = 'suspended', ai_daily_limit = 9999, full_name = 'Alice Updated' where id = auth.uid();
do $$ begin
  assert (select status from profiles where id = auth.uid()) = 'active', 'member changed own status';
  assert (select ai_daily_limit from profiles where id = auth.uid()) is null, 'member changed own AI limit';
  assert (select full_name from profiles where id = auth.uid()) = 'Alice Updated', 'member cannot edit own name';
end $$;

do $$ begin
  begin
    insert into user_roles (user_id, role_key) values (auth.uid(), 'administrator');
    raise exception 'privilege escalation possible';
  exception when insufficient_privilege or check_violation then null;
    when others then if sqlerrm = 'privilege escalation possible' then raise; end if;
  end;
  begin
    perform public.admin_overview_stats();
    raise exception 'member can call admin stats';
  exception when insufficient_privilege then null; end;
  begin
    perform public.analytics_heartbeat('{"presence_key":"u:22222222-2222-4222-8222-222222222222"}');
    raise exception 'member can call heartbeat directly';
  exception when insufficient_privilege then null; end;
  begin
    insert into saved_content (user_id, content_type, content_id) values ('33333333-3333-4333-8333-333333333333', 'article', gen_random_uuid());
    raise exception 'member saved content for another user';
  exception when insufficient_privilege then null; end;
  begin
    update news_articles set title = 'hacked' where true;
    if exists (select 1 from news_articles where title = 'hacked') then raise exception 'member edited news'; end if;
  end;
end $$;

insert into saved_content (user_id, content_type, content_id, title)
select auth.uid(), 'article', id, title from news_articles limit 2;
insert into favourite_brokers (user_id, broker_id) select auth.uid(), id from brokers where slug = 'atlas-fx';

set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
do $$ begin
  assert (select count(*) from saved_content) = 0, 'member can read another user''s saved content';
  assert (select count(*) from favourite_brokers) = 0, 'member can read another user''s favourites';
end $$;

-- content creator: may draft, may not publish
set request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
insert into news_articles (news_type, slug, title, status) values ('broker', 'creator-draft', 'Creator draft', 'draft');
do $$ begin
  begin
    update news_articles set status = 'published' where slug = 'creator-draft';
    raise exception 'creator published';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from news_articles where status = 'draft') >= 1, 'creator cannot see drafts';
end $$;
reset role;

-- ---------- anonymous access ----------
set role anon;
reset request.jwt.claim.sub;
do $$ begin
  assert (select count(*) from news_articles where slug = 'creator-draft') = 0, 'anon sees drafts';
  assert (select count(*) from banner_prompts where access_level = 'members') = 0, 'anon reads member-only prompt text';
  assert (select count(*) from banner_prompts_preview) = (select count(*) from banner_prompts_preview where prompt_preview is not null), 'preview view broken';
  assert (select count(*) from banner_prompts_preview) >= 4, 'anon cannot see prompt previews';
  assert (select count(*) from profiles) = 0, 'anon reads profiles';
  assert (select count(*) from website_settings where key = 'analytics.engagement_weights') = 0, 'anon reads private settings';
  assert (select count(*) from website_settings where key = 'site.general') = 1, 'anon cannot read public settings';
end $$;
reset role;

-- ---------- analytics pipeline (as service role) ----------
set role service_role;
select public.analytics_ingest(
  '{"id":"aaaaaaaa-0000-4000-8000-000000000001","user_id":"22222222-2222-4222-8222-222222222222","landing_path":"/","traffic_source":"direct","device_category":"desktop","browser":"Chrome","country":"AE"}',
  (select jsonb_agg(e) from (
    select jsonb_build_object('event_id', gen_random_uuid(), 'event_name', 'page_view', 'path', '/') e
    union all select jsonb_build_object('event_id', gen_random_uuid(), 'event_name', 'article_open', 'content_type', 'article',
        'content_id', (select id from news_articles where is_sample and news_type = 'broker' limit 1), 'path', '/news/x')
    union all select jsonb_build_object('event_id', gen_random_uuid(), 'event_name', 'article_engaged', 'content_type', 'article',
        'content_id', (select id from news_articles where is_sample and news_type = 'broker' limit 1), 'metadata', '{"news_type":"broker"}')
    union all select jsonb_build_object('event_id', gen_random_uuid(), 'event_name', 'banner_prompt_copy', 'content_type', 'banner_prompt',
        'content_id', (select id from banner_prompts limit 1), 'dedupe_key', 'copy|alice|p1|bucket')
    union all select jsonb_build_object('event_id', gen_random_uuid(), 'event_name', 'banner_prompt_copy', 'content_type', 'banner_prompt',
        'content_id', (select id from banner_prompts limit 1), 'dedupe_key', 'copy|alice|p1|bucket')
  ) s));

-- idempotent retry of the same event id
select public.analytics_ingest('{"id":"aaaaaaaa-0000-4000-8000-000000000001"}',
  jsonb_build_array(jsonb_build_object('event_id', (select event_id from analytics_events where event_name='page_view' limit 1), 'event_name','page_view')));

do $$ begin
  assert (select count(*) from analytics_events where event_name = 'banner_prompt_copy') = 1, 'duplicate copy recorded';
  assert (select count(*) from analytics_events where event_name = 'page_view') = 1, 'retry duplicated event';
  assert (select page_views from analytics_sessions where id = 'aaaaaaaa-0000-4000-8000-000000000001') = 1, 'page_views counter wrong';
end $$;

-- heartbeats: two tabs, one hidden; hidden tab must not add engaged time or a second presence row
select public.analytics_heartbeat('{"presence_key":"u:22222222-2222-4222-8222-222222222222","user_id":"22222222-2222-4222-8222-222222222222","session_id":"aaaaaaaa-0000-4000-8000-000000000001","tab_id":"t1","visible":true,"interacted":true,"engaged_delta":45,"interval_seconds":45,"path":"/dashboard"}');
select public.analytics_heartbeat('{"presence_key":"u:22222222-2222-4222-8222-222222222222","user_id":"22222222-2222-4222-8222-222222222222","session_id":"aaaaaaaa-0000-4000-8000-000000000001","tab_id":"t2","visible":false,"interacted":false,"engaged_delta":45,"interval_seconds":45,"path":"/news"}');
select public.analytics_heartbeat('{"presence_key":"u:22222222-2222-4222-8222-222222222222","user_id":"22222222-2222-4222-8222-222222222222","session_id":"aaaaaaaa-0000-4000-8000-000000000001","tab_id":"t1","visible":true,"interacted":true,"engaged_delta":9999,"interval_seconds":45,"path":"/dashboard"}');
do $$ begin
  assert (select count(*) from visitor_presence) = 1, 'multiple tabs created multiple presence rows';
  assert (select engaged_seconds from daily_user_activity where user_id = '22222222-2222-4222-8222-222222222222') = 105, 'engaged time not capped/filtered (expected 45 + 60)';
  assert (select current_path from visitor_presence) = '/dashboard', 'hidden tab overwrote current page';
  assert (select state from visitor_presence) = 'active', 'state wrong';
  assert (select (select count(*) from jsonb_object_keys(open_tabs)) from visitor_presence) = 2, 'tab tracking wrong';
end $$;

select public.analytics_rollup_day((now() at time zone 'utc')::date);
select public.refresh_engagement_scores();
do $$ begin
  assert (select prompts_copied from daily_user_activity where user_id = '22222222-2222-4222-8222-222222222222') = 1, 'rollup prompts_copied wrong';
  assert (select articles_read from daily_user_activity where user_id = '22222222-2222-4222-8222-222222222222') = 1, 'rollup articles wrong';
  -- score = active day 5 + 1 engaged minute*1 + 1 article*2 + 1 prompt copy*5 = 13
  assert (select score from daily_user_activity where user_id = '22222222-2222-4222-8222-222222222222') = 13, 'score formula wrong';
  assert (select rank_all_time from user_engagement_scores where user_id = '22222222-2222-4222-8222-222222222222') = 1, 'rank wrong';
  assert (select current_streak from user_engagement_scores where user_id = '22222222-2222-4222-8222-222222222222') = 1, 'streak wrong';
  assert (select unique_visitors from daily_analytics_summary where day = (now() at time zone 'utc')::date) = 1, 'summary wrong';
end $$;
reset role;

-- ---------- admin reads ----------
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$ declare r jsonb; begin
  r := public.admin_overview_stats();
  assert (r->'users'->>'total')::int = 4, 'overview total users wrong';
  assert (r->'users'->>'online_registered')::int = 1, 'online count wrong';
  assert (select count(*) from public.get_leaderboard(current_date - 6, current_date, 'score')) = 1, 'leaderboard empty';
  assert (select user_id from public.get_leaderboard(current_date, current_date, 'prompts')) = '22222222-2222-4222-8222-222222222222', 'prompt leaderboard wrong';
  assert (select count(*) from public.get_live_visitors()) = 1, 'live visitors wrong';
  assert (select email from public.get_live_visitors()) = 'alice@test.local', 'super admin should see email';
  assert (public.user_analytics_summary('22222222-2222-4222-8222-222222222222')->>'prompts_copied')::int = 1, 'user summary wrong';
  assert (select count(*) from public.segment_user_ids('{"professions":["introducing_broker"]}')) = 1, 'segment wrong';
  assert (select count(*) from ai_generations) = 0, 'admin can read private AI content';
  perform public.log_admin_action('test_action', 'tests', 'x', '{}');
  assert (select count(*) from admin_audit_logs where action = 'test_action') = 1, 'audit insert failed';
end $$;

insert into notifications (id, title, category, audience) values ('bbbbbbbb-0000-4000-8000-000000000001', 'Test', 'announcement', '{"type":"all"}');
select public.deliver_notification('bbbbbbbb-0000-4000-8000-000000000001');
select public.deliver_notification('bbbbbbbb-0000-4000-8000-000000000001');
do $$ begin
  assert (select count(*) from user_notifications) = 1, 'admin can read other users'' notifications';
end $$;
reset role;
do $$ begin
  assert (select count(*) from user_notifications where notification_id = 'bbbbbbbb-0000-4000-8000-000000000001') = 4, 'notification fan-out wrong / duplicated';
end $$;

-- analytics viewer cannot see PII
insert into user_roles (user_id, role_key) values ('33333333-3333-4333-8333-333333333333', 'analytics_viewer');
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
do $$ begin
  assert (select email from public.get_live_visitors() limit 1) is null, 'analytics viewer sees email';
  assert (select count(*) from profiles) = 1, 'analytics viewer reads profiles directory';
end $$;
reset role;

-- audit logs are append-only
do $$ begin
  begin
    update admin_audit_logs set action = 'tampered';
    raise exception 'audit log mutable';
  exception when insufficient_privilege then null; end;
end $$;

-- scheduled publishing
update news_articles set status = 'scheduled', scheduled_at = now() - interval '1 minute' where slug = 'creator-draft';
select public.publish_due_content();
do $$ begin
  assert (select status from news_articles where slug = 'creator-draft') = 'published', 'scheduled publish failed';
  assert public.rate_limit_hit('t', 60, 2) and public.rate_limit_hit('t', 60, 2) and not public.rate_limit_hit('t', 60, 2), 'rate limit wrong';
end $$;

\echo 'db tests ok'
