# Official RSS collection (testing)

Live database project: FX Broker Updates. `fx_news_private.refresh()` is called by cron job `fx-official-news-refresh` every 5 minutes; each enabled official feed is fetched no more often than 15 minutes. The worker uses pg_net and a private request-tracking table with RLS. Current scope is three Federal Reserve feeds; the BLS feed returned 403 and is disabled. Do not circumvent that restriction.

Only titles, source links, timestamps and classification metadata are stored. Entries remain pending_review; no AI-generated claims or automatic publishing. Source rights and URLs must be reviewed before allowlist expansion. See https://www.federalreserve.gov/feeds/feeds.htm and https://www.bls.gov/help/hlp_rss.htm .

Admin source status uses column-level SELECT with the existing sources.manage/health.view RLS. Existing admin role must be assigned to a verified owner before real admin acceptance testing. The cron worker is not callable by anon/authenticated. Keep net and cron schemas out of exposed API schemas; managed pg_net function privileges remain provider-controlled.

Stop collection by disabling the existing news_refresh scheduled_jobs record or unscheduling this specific cron job. Check news_source_runs, news_sources and cron.job_run_details for runtime health. The GitHub SQL file records current worker definitions, not a complete standalone migration. Live schema migrations are recorded in Supabase. Manual Vercel redeployment remains necessary for updated UI.
