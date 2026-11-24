-- =====================================================================
-- 0007 Default website configuration (editable in the admin panel) and storage
-- =====================================================================

insert into public.website_settings (key, value, is_public, description) values
('site.general', '{
  "name": "FX Broker Updates",
  "tagline": "Your Trusted Source for Global Broker News",
  "domain": "www.fxbrokerupdates.com",
  "contact_email": "contact@fxbrokerupdates.com",
  "logo_url": "/images/logo.png",
  "default_language": "en",
  "default_timezone": "Asia/Karachi"
}', true, 'Brand name, logo, domain and contact'),
('site.theme', '{
  "deep_navy": "#06182D", "dark_navy": "#031222", "secondary_navy": "#102A46", "royal_navy": "#153B60",
  "primary_gold": "#F5C542", "bright_gold": "#FFCC33", "light_bg": "#F4F7FB", "muted_text": "#A8B8CA"
}', true, 'Brand colour tokens applied site-wide'),
('site.registration', '{"enabled": true, "require_email_verification": true, "terms_version": "1.0"}', true, 'Registration rules'),
('site.maintenance', '{"enabled": false, "message": "We are upgrading FX Broker Updates. Please check back shortly."}', true, 'Maintenance mode'),
('site.seo', '{
  "default_title": "FX Broker Updates — Latest Broker Updates & Trading Market News",
  "default_description": "Global Forex broker news, promotions, regulatory updates, trading market news and free daily AI banner prompts and video scripts.",
  "og_image": "/images/hero-markets.webp",
  "twitter_handle": ""
}', true, 'SEO defaults'),
('site.footer', '{
  "description": "Independent financial news, global broker updates, market insights and free resources for traders, IBs and content creators.",
  "newsletter_title": "Stay Ahead of the Market",
  "newsletter_text": "Get the latest broker news, trading updates and free daily content in your inbox.",
  "advertise_title": "Advertise With Us",
  "advertise_text": "Promote your broker, product or campaign.",
  "risk_disclaimer": "Trading Forex and CFDs involves significant risk. All information published on FX Broker Updates is for informational and educational purposes only and does not constitute financial advice.",
  "copyright_name": "FX Broker Updates"
}', true, 'Footer texts'),
('site.legal', '{
  "about": "FX Broker Updates is an independent financial media platform covering global Forex broker news, trading market updates and free daily content tools for traders, Introducing Brokers, affiliates and financial content creators.\n\nWe are not a broker, trading platform or signal provider. We do not hold client funds, execute trades or provide investment advice.",
  "privacy": "This policy explains what we collect and why.\n\n## Account data\nName, email, phone (optional), country and profession you provide at registration.\n\n## First-party analytics\nWe record page views, feature usage (for example opening an article, copying a prompt) and estimated active time on FX Broker Updates only. We do not record keystrokes, clipboard contents, form inputs, screen recordings or activity outside this website, and we do not store raw IP addresses. Country is derived from our hosting provider and stored as a two-letter code. Raw events are deleted after the configured retention period (default 90 days); anonymous aggregates may be kept longer.\n\n## Your choices\nYou can decline optional analytics for anonymous browsing, manage marketing consent, export your data and request account deletion from your account settings.",
  "terms": "By using FX Broker Updates you agree to use the content for lawful purposes. Content is provided for information only and is not financial advice. Generated AI content must be reviewed by you before publication.",
  "disclaimer": "Trading Forex, CFDs and cryptocurrencies involves significant risk and may not be suitable for all investors. FX Broker Updates does not provide investment advice. Broker information, promotions and regulatory details may change; always verify with the broker and the relevant regulator.",
  "advertise": "Reach traders, Introducing Brokers and financial professionals. Sponsored placements are always clearly labelled."
}', true, 'Legal and static page content'),
('analytics.tracking', '{
  "enabled": true, "heartbeat_seconds": 45, "idle_seconds": 120, "offline_seconds": 150,
  "anonymous_requires_consent": true, "retention_days": 90
}', true, 'Tracking behaviour (public so the browser tracker can read it)'),
('analytics.engagement_weights', '{
  "active_day": 5, "engaged_minute": 1, "engaged_minutes_cap": 60, "article_read": 2, "articles_cap": 25,
  "prompt_copy": 5, "prompt_copies_cap": 10, "script_copy": 5, "script_copies_cap": 10,
  "ai_generation": 8, "ai_generations_cap": 10, "content_saved": 3, "saves_cap": 10, "min_active_seconds": 60
}', false, 'Engagement score weights and daily caps'),
('content.access', '{"guest_preview": true}', true, 'Guest access to prompts/scripts'),
('news.pipeline', '{
  "default_refresh_minutes": 5, "max_sources_per_run": 15, "fetch_timeout_ms": 10000, "max_items_per_source": 30,
  "high_risk_keywords": ["scam","fraud","warning","unauthori","license revoked","clone","ponzi","investigation","fined","sanction","blacklist","suspended"],
  "hot_keywords": ["breaking","rate decision","acquisition","acquires","revoked","halts","record"],
  "similarity_threshold": 0.82
}', false, 'News ingestion pipeline'),
('automation.daily', '{
  "enabled": false, "publish_time_utc": "06:00", "prompts_count": 3, "scripts_count": 2,
  "languages": ["en"], "categories": ["broker_news","gold","forex"], "durations": [40, 60],
  "auto_generate_drafts": true, "require_approval": true, "auto_publish": false
}', false, 'Daily content automation'),
('notifications.config', '{"email_provider": "resend", "push_provider": "onesignal", "dedupe_minutes": 60}', false, 'Notification providers'),
('storage.uploads', '{"max_upload_mb": 5, "allowed_types": ["image/png","image/jpeg","image/webp","image/gif"]}', false, 'Upload rules');

insert into public.homepage_sections (key, title, sort_order, content) values
('hero', 'Hero', 10, '{
  "badge": "Global Broker News & Market Updates",
  "title_line1": "Latest Broker Updates &",
  "title_line2": "Trading Market News",
  "subtitle": "Your trusted source for global broker announcements, promotions, platform updates, and live market highlights.",
  "primary_label": "Explore Updates", "primary_href": "/news",
  "secondary_label": "Get Daily Free Tools", "secondary_href": "/free-tools",
  "image_url": "/images/hero-markets.webp",
  "chips": [
    {"label": "Broker News", "icon": "shield-check", "href": "/broker-updates"},
    {"label": "Trading Updates", "icon": "bar-chart", "href": "/trading-updates"},
    {"label": "Promotions", "icon": "gift", "href": "/category/promotions-bonuses"},
    {"label": "Regulatory Alerts", "icon": "bell", "href": "/category/regulatory-updates"}
  ]
}'),
('social_cards', 'Social & promotion cards', 20, '{
  "cards": [
    {"key": "facebook", "title": "Facebook", "description": "Join our Facebook Community for latest updates.", "href": "https://www.facebook.com/", "visible": true, "external": true},
    {"key": "dott_plus", "title": "Download Dott Plus", "description": "Get Free Courses & Signals for Smarter Trading.", "href": "https://example.com/dott-plus", "visible": true, "external": true, "image_url": "/images/dott-plus.png"},
    {"key": "linkedin", "title": "LinkedIn", "description": "Follow us on LinkedIn for professional updates.", "href": "https://www.linkedin.com/", "visible": true, "external": true}
  ]
}'),
('daily_tools', 'Daily free content tools', 30, '{
  "cards": [
    {"key": "banner", "title_line1": "Get Your Daily Free", "title_line2": "Banner Prompt", "description": "AI prompts for professional trading banners.", "href": "/free-tools/banner-prompts", "image_url": "/images/banner-prompt.png"},
    {"key": "video", "title_line1": "Get Your Daily", "title_line2": "Video Script", "description": "Ready-to-use video scripts for trading & broker news.", "href": "/free-tools/video-scripts", "image_url": "/images/video-script.png"}
  ]
}'),
('news_bar', 'All news call-to-action bar', 40, '{"label": "Click Here to Get All News Updates", "href": "/news"}'),
('todays_updates', 'Today''s updates panels', 50, '{
  "broker_title_plain": "Today''s", "broker_title_gold": "Broker Updates",
  "trading_title_plain": "Today''s", "trading_title_gold": "Trading Updates",
  "items_per_panel": 3
}'),
('categories', 'Category cards', 60, '{}'),
('advertisement', 'Homepage advertisement slot', 70, '{}');

insert into public.footer_sections (column_key, title, sort_order, items) values
('quick_links', 'Quick Links', 10, '[
  {"label":"Home","href":"/"},{"label":"About Us","href":"/about"},{"label":"Broker Updates","href":"/broker-updates"},
  {"label":"Trading Updates","href":"/trading-updates"},{"label":"Broker Reviews","href":"/brokers"},{"label":"Contact Us","href":"/contact"}]'),
('news_insights', 'News & Insights', 20, '[
  {"label":"Broker News","href":"/category/broker-news"},{"label":"Market News","href":"/trading-updates"},
  {"label":"Promotions & Bonuses","href":"/category/promotions-bonuses"},{"label":"Regulatory Updates","href":"/category/regulatory-updates"},
  {"label":"IB & Partnerships","href":"/category/ib-affiliate"},{"label":"Market Analysis","href":"/trading-updates?market=market_analysis"}]'),
('free_resources', 'Free Resources', 30, '[
  {"label":"Daily Banner Prompts","href":"/free-tools/banner-prompts"},{"label":"Daily Video Scripts","href":"/free-tools/video-scripts"},
  {"label":"AI Creator Studio","href":"/dashboard/studio"},{"label":"Download Dott Plus","href":"https://example.com/dott-plus","external":true},
  {"label":"Tools & Templates","href":"/free-tools","flag":"tools_templates"}]');

insert into public.social_links (platform, label, url, sort_order) values
  ('facebook', 'Facebook', 'https://www.facebook.com/', 10),
  ('linkedin', 'LinkedIn', 'https://www.linkedin.com/', 20),
  ('instagram', 'Instagram', 'https://www.instagram.com/', 30),
  ('youtube', 'YouTube', 'https://www.youtube.com/', 40),
  ('telegram', 'Telegram', 'https://t.me/', 50);

insert into public.navigation_items (id, parent_id, label, href, sort_order) values
  ('00000000-0000-4000-8000-000000000001', null, 'Home', '/', 10),
  ('00000000-0000-4000-8000-000000000002', null, 'Broker Updates', '/broker-updates', 20),
  ('00000000-0000-4000-8000-000000000003', null, 'Trading Updates', '/trading-updates', 30),
  ('00000000-0000-4000-8000-000000000004', null, 'Free Tools', '/free-tools', 40),
  ('00000000-0000-4000-8000-000000000005', null, 'Broker Reviews', '/brokers', 50),
  ('00000000-0000-4000-8000-000000000006', null, 'About', '/about', 60);
insert into public.navigation_items (parent_id, label, href, sort_order) values
  ('00000000-0000-4000-8000-000000000002', 'All Broker News', '/broker-updates', 10),
  ('00000000-0000-4000-8000-000000000002', 'Promotions & Bonuses', '/category/promotions-bonuses', 20),
  ('00000000-0000-4000-8000-000000000002', 'Regulatory Updates', '/category/regulatory-updates', 30),
  ('00000000-0000-4000-8000-000000000002', 'IB & Affiliate', '/category/ib-affiliate', 40),
  ('00000000-0000-4000-8000-000000000002', 'Scam Alerts', '/category/scam-alerts', 50),
  ('00000000-0000-4000-8000-000000000003', 'All Market News', '/trading-updates', 10),
  ('00000000-0000-4000-8000-000000000003', 'Gold', '/trading-updates?market=gold', 20),
  ('00000000-0000-4000-8000-000000000003', 'Forex', '/trading-updates?market=forex', 30),
  ('00000000-0000-4000-8000-000000000003', 'Crypto', '/trading-updates?market=crypto', 40),
  ('00000000-0000-4000-8000-000000000003', 'Central Banks', '/trading-updates?market=central_banks', 50),
  ('00000000-0000-4000-8000-000000000004', 'Daily Banner Prompts', '/free-tools/banner-prompts', 10),
  ('00000000-0000-4000-8000-000000000004', 'Daily Video Scripts', '/free-tools/video-scripts', 20),
  ('00000000-0000-4000-8000-000000000004', 'AI Creator Studio', '/dashboard/studio', 30);

insert into public.feature_flags (key, description, enabled) values
  ('banner_prompts', 'Daily banner prompt library', true),
  ('video_scripts', 'Daily video script library', true),
  ('ai_studio', 'Member AI Creator Studio', true),
  ('broker_directory', 'Broker directory and reviews', true),
  ('user_reviews', 'Allow members to submit broker reviews', false),
  ('newsletter', 'Newsletter signup', true),
  ('notifications', 'In-app notifications', true),
  ('advertisements', 'Advertisement placements', true),
  ('tools_templates', 'Tools & Templates footer link', false),
  ('pwa', 'Installable web app and service worker', true),
  ('registration', 'New member registration', true);

insert into public.scheduled_jobs (key, name, description, interval_minutes) values
  ('news_refresh',        'News collection',            'Fetch due news sources',                               5),
  ('publish_scheduled',   'Publish scheduled content',  'Publish articles, prompts and scripts whose time has come', 5),
  ('presence_prune',      'Presence cleanup',           'Remove visitors that missed heartbeats',               5),
  ('notifications_dispatch','Scheduled notifications',  'Deliver scheduled notifications',                      5),
  ('analytics_rollup',    'Analytics rollup (today)',   'Aggregate today''s analytics and rankings',            60),
  ('analytics_daily',     'Analytics rollup (yesterday)','Finalize yesterday and retention cohorts',            1440),
  ('analytics_purge',     'Analytics retention',        'Delete raw events past the retention window',          1440),
  ('daily_content',       'Daily content automation',   'Draft daily banner prompts and video scripts with AI', 1440);

insert into public.user_segments (name, description, rules, is_system) values
  ('New Members', 'Registered in the last 7 days', '{"registered_within_days": 7}', true),
  ('Daily Active Users', 'Active today or yesterday', '{"active_within_days": 2}', true),
  ('Highly Engaged Members', '30-day score ≥ 150', '{"min_score_30d": 150}', true),
  ('Inactive for 7 Days', 'No active day in 7 days', '{"inactive_for_days": 7}', true),
  ('Inactive for 30 Days', 'No active day in 30 days', '{"inactive_for_days": 30}', true),
  ('Active Content Creators', 'Content creators active in 30 days', '{"professions": ["content_creator"], "active_within_days": 30}', true),
  ('Active IB Partners', 'Introducing Brokers active in 30 days', '{"professions": ["introducing_broker"], "active_within_days": 30}', true),
  ('Active Broker Employees', 'Broker employees active in 30 days', '{"professions": ["broker_employee"], "active_within_days": 30}', true),
  ('Frequent Banner Prompt Users', '≥5 prompt copies in 30 days', '{"feature": "prompts", "feature_min": 5}', true),
  ('Frequent Video Script Users', '≥5 script copies in 30 days', '{"feature": "scripts", "feature_min": 5}', true),
  ('Frequent AI Creator Studio Users', '≥5 AI generations in 30 days', '{"feature": "ai", "feature_min": 5}', true),
  ('Marketing Consented', 'Opted in to marketing', '{"marketing_consent": true}', true);

insert into public.ai_templates (name, content_type, scope, instructions) values
  ('FX Broker Updates house style', 'any', 'both',
   'Write in a clear, professional, neutral financial-media tone. Never invent statistics, prices, licenses or quotes. If a fact is not in the provided source, say it should be verified. Add "Not financial advice" where appropriate.'),
  ('Banner prompt — premium navy & gold', 'banner_prompt', 'both',
   'Describe a premium financial banner with deep navy background, gold accents, clean typography area for a headline, subtle chart elements. Specify composition, lighting, style and aspect ratio. No real company logos unless the user supplies them.');

-- ---------- storage buckets ----------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
    insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

    execute $p$create policy "media public read" on storage.objects for select using (bucket_id = 'media')$p$;
    execute $p$create policy "media staff write" on storage.objects for insert to authenticated
      with check (bucket_id = 'media' and public.is_staff())$p$;
    execute $p$create policy "media staff delete" on storage.objects for delete to authenticated
      using (bucket_id = 'media' and public.is_staff())$p$;
    execute $p$create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars')$p$;
    execute $p$create policy "avatars own write" on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "avatars own update" on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "avatars own delete" on storage.objects for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end $$;
