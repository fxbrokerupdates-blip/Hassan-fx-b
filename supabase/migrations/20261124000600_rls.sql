-- =====================================================================
-- 0006 Row Level Security
-- Default deny: every table has RLS enabled. Service role bypasses RLS and is
-- used only on the server (API routes, cron jobs).
-- =====================================================================

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;


-- ---------- roles / permissions ----------
create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (public.is_staff());
create policy role_permissions_read on public.role_permissions for select to authenticated using (public.is_staff());
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------- profiles ----------
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_permission('users.view'));
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_permission('users.manage'))
  with check (id = auth.uid() or public.has_permission('users.manage'));

create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.view') or public.has_permission('roles.manage'));
create policy user_roles_write on public.user_roles for all to authenticated
  using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

create policy user_preferences_own on public.user_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_preferences_staff on public.user_preferences for select to authenticated
  using (public.has_permission('users.view'));

create policy user_feature_access_read on public.user_feature_access for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.view'));
create policy user_feature_access_write on public.user_feature_access for all to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));

create policy user_consents_read on public.user_consents for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.view'));
create policy user_consents_insert on public.user_consents for insert to authenticated
  with check (user_id = auth.uid());

create policy account_requests_own on public.account_requests for select to authenticated
  using (user_id = auth.uid() or public.has_permission('users.manage'));
create policy account_requests_insert on public.account_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy account_requests_staff on public.account_requests for update to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));

-- ---------- public content ----------
create policy categories_read on public.news_categories for select to anon, authenticated
  using (is_active or public.has_permission('news.view'));
create policy categories_write on public.news_categories for all to authenticated
  using (public.has_permission('news.edit')) with check (public.has_permission('news.edit'));

create policy brokers_read on public.brokers for select to anon, authenticated
  using (status = 'active' or public.has_permission('brokers.manage'));
create policy brokers_write on public.brokers for all to authenticated
  using (public.has_permission('brokers.manage')) with check (public.has_permission('brokers.manage'));

create policy broker_regulations_read on public.broker_regulations for select to anon, authenticated using (true);
create policy broker_regulations_write on public.broker_regulations for all to authenticated
  using (public.has_permission('brokers.manage')) with check (public.has_permission('brokers.manage'));

create policy broker_reviews_read on public.broker_reviews for select to anon, authenticated
  using (status = 'approved' or user_id = auth.uid() or public.has_permission('brokers.manage'));
create policy broker_reviews_user_insert on public.broker_reviews for insert to authenticated
  with check (user_id = auth.uid() and review_type = 'user' and status = 'pending');
create policy broker_reviews_staff on public.broker_reviews for all to authenticated
  using (public.has_permission('brokers.manage')) with check (public.has_permission('brokers.manage'));

create policy broker_promotions_read on public.broker_promotions for select to anon, authenticated
  using (status = 'active' or public.has_permission('brokers.manage'));
create policy broker_promotions_write on public.broker_promotions for all to authenticated
  using (public.has_permission('brokers.manage')) with check (public.has_permission('brokers.manage'));

create policy news_read on public.news_articles for select to anon, authenticated
  using ((status = 'published' and published_at <= now()) or public.has_permission('news.view'));
create policy news_insert on public.news_articles for insert to authenticated
  with check (public.has_permission('news.edit'));
create policy news_update on public.news_articles for update to authenticated
  using (public.has_permission('news.edit')) with check (public.has_permission('news.edit'));
create policy news_delete on public.news_articles for delete to authenticated
  using (public.has_permission('news.delete'));

create policy news_tags_read on public.news_tags for select to anon, authenticated using (true);
create policy news_tags_write on public.news_tags for all to authenticated
  using (public.has_permission('news.edit')) with check (public.has_permission('news.edit'));
create policy news_article_tags_read on public.news_article_tags for select to anon, authenticated using (true);
create policy news_article_tags_write on public.news_article_tags for all to authenticated
  using (public.has_permission('news.edit')) with check (public.has_permission('news.edit'));

create policy editorial_revisions_read on public.editorial_revisions for select to authenticated
  using (public.has_permission('news.view'));

create policy news_sources_read on public.news_sources for select to authenticated
  using (public.has_permission('sources.manage') or public.has_permission('health.view'));
create policy news_sources_write on public.news_sources for all to authenticated
  using (public.has_permission('sources.manage')) with check (public.has_permission('sources.manage'));
create policy news_source_runs_read on public.news_source_runs for select to authenticated
  using (public.has_permission('sources.manage') or public.has_permission('health.view'));
create policy news_source_errors_read on public.news_source_errors for select to authenticated
  using (public.has_permission('sources.manage') or public.has_permission('health.view'));

-- Full prompt/script text: public items for everyone, member items for signed-in users.
-- Guests see member-only items through the *_preview views (truncated).
create policy banner_prompts_read on public.banner_prompts for select to anon, authenticated
  using ((status = 'published' and (access_level = 'public' or auth.uid() is not null)) or public.has_permission('prompts.manage'));
create policy banner_prompts_write on public.banner_prompts for all to authenticated
  using (public.has_permission('prompts.manage')) with check (public.has_permission('prompts.manage'));

create policy video_scripts_read on public.video_scripts for select to anon, authenticated
  using ((status = 'published' and (access_level = 'public' or auth.uid() is not null)) or public.has_permission('scripts.manage'));
create policy video_scripts_write on public.video_scripts for all to authenticated
  using (public.has_permission('scripts.manage')) with check (public.has_permission('scripts.manage'));

create policy content_reports_insert on public.content_reports for insert to authenticated
  with check (user_id = auth.uid() and status = 'open');
create policy content_reports_staff on public.content_reports for all to authenticated
  using (public.has_permission('content_reports.manage')) with check (public.has_permission('content_reports.manage'));

-- ---------- AI ----------
create policy ai_settings_read on public.ai_provider_settings for select to authenticated
  using (public.has_permission('ai.settings') or public.has_permission('ai.use_admin'));
create policy ai_settings_write on public.ai_provider_settings for update to authenticated
  using (public.has_permission('ai.settings')) with check (public.has_permission('ai.settings'));

create policy ai_templates_read on public.ai_templates for select to authenticated
  using ((is_active and scope in ('member','both')) or public.has_permission('ai.use_admin'));
create policy ai_templates_write on public.ai_templates for all to authenticated
  using (public.has_permission('ai.settings')) with check (public.has_permission('ai.settings'));

-- Private generated content: owner only. Staff analytics use counts, never the text.
create policy ai_generations_own on public.ai_generations for select to authenticated using (user_id = auth.uid());
create policy ai_generations_own_update on public.ai_generations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_generations_own_delete on public.ai_generations for delete to authenticated using (user_id = auth.uid());

create policy ai_usage_logs_read on public.ai_usage_logs for select to authenticated
  using (user_id = auth.uid() or public.has_permission('ai.settings'));

-- ---------- member data ----------
create policy collections_own on public.user_collections for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_content_own on public.saved_content for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy collection_items_own on public.collection_items for all to authenticated
  using (exists (select 1 from public.user_collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (
    exists (select 1 from public.user_collections c where c.id = collection_id and c.user_id = auth.uid())
    and exists (select 1 from public.saved_content s where s.id = saved_id and s.user_id = auth.uid()));
create policy favourite_brokers_own on public.favourite_brokers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_segments_staff on public.user_segments for all to authenticated
  using (public.has_permission('users.view') or public.has_permission('analytics.view') or public.has_permission('notifications.manage'))
  with check (public.has_permission('users.view') or public.has_permission('analytics.view') or public.has_permission('notifications.manage'));

-- ---------- communication ----------
create policy notifications_read on public.notifications for select to authenticated
  using (public.has_permission('notifications.manage')
         or exists (select 1 from public.user_notifications un where un.notification_id = notifications.id and un.user_id = auth.uid()));
create policy notifications_write on public.notifications for all to authenticated
  using (public.has_permission('notifications.manage')) with check (public.has_permission('notifications.manage'));

create policy user_notifications_own on public.user_notifications for select to authenticated using (user_id = auth.uid());
create policy user_notifications_own_update on public.user_notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy newsletter_subscribers_staff on public.newsletter_subscribers for all to authenticated
  using (public.has_permission('newsletter.manage')) with check (public.has_permission('newsletter.manage'));
create policy newsletter_campaigns_staff on public.newsletter_campaigns for all to authenticated
  using (public.has_permission('newsletter.manage')) with check (public.has_permission('newsletter.manage'));

create policy contact_messages_staff on public.contact_messages for all to authenticated
  using (public.has_permission('inbox.manage')) with check (public.has_permission('inbox.manage'));
create policy contact_messages_own on public.contact_messages for select to authenticated using (user_id = auth.uid());
create policy advertising_enquiries_staff on public.advertising_enquiries for all to authenticated
  using (public.has_permission('inbox.manage')) with check (public.has_permission('inbox.manage'));

-- ---------- administration ----------
create policy audit_read on public.admin_audit_logs for select to authenticated using (public.has_permission('audit.view'));

create policy admin_notes_staff on public.admin_notes for select to authenticated using (public.has_permission('users.view'));
create policy admin_notes_insert on public.admin_notes for insert to authenticated
  with check (public.has_permission('users.view') and author_id = auth.uid());

create policy settings_public_read on public.website_settings for select to anon, authenticated
  using (is_public or public.has_permission('settings.manage'));
create policy settings_write on public.website_settings for all to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

create policy homepage_read on public.homepage_sections for select to anon, authenticated using (true);
create policy homepage_write on public.homepage_sections for all to authenticated
  using (public.has_permission('homepage.manage')) with check (public.has_permission('homepage.manage'));
create policy navigation_read on public.navigation_items for select to anon, authenticated using (is_visible or public.has_permission('homepage.manage'));
create policy navigation_write on public.navigation_items for all to authenticated
  using (public.has_permission('homepage.manage')) with check (public.has_permission('homepage.manage'));
create policy footer_read on public.footer_sections for select to anon, authenticated using (is_visible or public.has_permission('homepage.manage'));
create policy footer_write on public.footer_sections for all to authenticated
  using (public.has_permission('homepage.manage')) with check (public.has_permission('homepage.manage'));
create policy social_read on public.social_links for select to anon, authenticated using (is_visible or public.has_permission('homepage.manage'));
create policy social_write on public.social_links for all to authenticated
  using (public.has_permission('homepage.manage')) with check (public.has_permission('homepage.manage'));

create policy ads_public_read on public.advertisements for select to anon, authenticated
  using ((is_active and starts_at <= now() and (ends_at is null or ends_at > now())) or public.has_permission('ads.manage'));
create policy ads_write on public.advertisements for all to authenticated
  using (public.has_permission('ads.manage')) with check (public.has_permission('ads.manage'));
create policy ad_events_read on public.advertisement_events for select to authenticated using (public.has_permission('ads.manage'));

create policy jobs_read on public.scheduled_jobs for select to authenticated
  using (public.has_permission('jobs.manage') or public.has_permission('health.view'));
create policy jobs_write on public.scheduled_jobs for update to authenticated
  using (public.has_permission('jobs.manage')) with check (public.has_permission('jobs.manage'));
create policy job_logs_read on public.job_execution_logs for select to authenticated
  using (public.has_permission('jobs.manage') or public.has_permission('health.view'));

create policy feature_flags_read on public.feature_flags for select to anon, authenticated using (true);
create policy feature_flags_write on public.feature_flags for all to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

create policy media_read on public.media_library for select to authenticated using (public.is_staff());
create policy media_write on public.media_library for insert to authenticated with check (public.is_staff() and uploaded_by = auth.uid());

create policy errors_read on public.system_error_logs for select to authenticated using (public.has_permission('health.view'));

create policy redirects_read on public.redirects for select to anon, authenticated using (true);
create policy redirects_write on public.redirects for all to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

-- rate_limits: no policies → only service role / definer functions.

-- ---------- analytics (read-only for authorized staff; writes via service role) ----------
create policy sessions_read on public.analytics_sessions for select to authenticated using (public.has_permission('analytics.users'));
create policy events_read on public.analytics_events for select to authenticated using (public.has_permission('analytics.users'));
create policy presence_read on public.visitor_presence for select to authenticated using (public.has_permission('analytics.live'));
create policy dua_read on public.daily_user_activity for select to authenticated
  using (user_id = auth.uid() or public.has_permission('analytics.view'));
create policy scores_read on public.user_engagement_scores for select to authenticated using (public.has_permission('analytics.view'));
create policy summary_read on public.daily_analytics_summary for select to authenticated using (public.has_permission('analytics.view'));
create policy content_summary_read on public.content_analytics_summary for select to authenticated using (public.has_permission('analytics.view'));
create policy cohorts_read on public.user_retention_cohorts for select to authenticated using (public.has_permission('analytics.view'));
create policy reports_read on public.analytics_reports for select to authenticated using (public.has_permission('audit.view') or created_by = auth.uid());

-- ---------- guest previews of member-only prompts/scripts ----------
create or replace view public.banner_prompts_preview as
  select id, title, left(prompt_text, 160) || case when char_length(prompt_text) > 160 then '…' else '' end as prompt_preview,
         preview_image_url, category, tags, aspect_ratio, language, related_article_id, publish_date, published_at,
         is_featured, access_level, is_sample
  from public.banner_prompts
  where status = 'published';

create or replace view public.video_scripts_preview as
  select id, title, topic, hook, duration_seconds, language, related_article_id, publish_date, published_at,
         is_featured, access_level, is_sample
  from public.video_scripts
  where status = 'published';

grant select on public.banner_prompts_preview, public.video_scripts_preview to anon, authenticated;

-- Realtime: live visitors (RLS applies to realtime subscribers).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.visitor_presence;
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end $$;
