-- Current live database definitions; requires pg_net, pg_cron and fx_news_private.feed_requests.
CREATE OR REPLACE FUNCTION fx_news_private.ingest_rss(p_source uuid, p_xml text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare s public.news_sources%rowtype; item record; url text; ttl text; published timestamptz; fingerprint text; hash text; ins int:=0; dup int:=0; seen int:=0; affected int;
begin
select * into strict s from public.news_sources where id=p_source and enabled and collection_permitted;
if s.feed_url not in ('https://www.federalreserve.gov/feeds/press_monetary.xml','https://www.federalreserve.gov/feeds/speeches_and_testimony.xml','https://www.federalreserve.gov/feeds/press_bcreg.xml','https://www.bls.gov/feed/bls_latest.rss') then raise exception 'Source not allowlisted'; end if;
if p_xml is null or octet_length(p_xml)>2000000 or p_xml~* '<!\s*(DOCTYPE|ENTITY)' then raise exception 'Unsafe or oversized XML';end if;
if not xml_is_well_formed_document(p_xml) then raise exception 'Invalid RSS XML';end if;
for item in select * from xmltable('/*[local-name()="rss"]/*[local-name()="channel"]/*[local-name()="item"]' passing xmlparse(document p_xml) columns title text path '*[local-name()="title"]', link text path '*[local-name()="link"]', published text path '*[local-name()="pubDate"]') limit 30 loop
 seen:=seen+1;ttl:=left(trim(regexp_replace(coalesce(item.title,''),'[[:space:]]+',' ','g')),300);url:=split_part(trim(coalesce(item.link,'')),'#',1);
 if length(ttl)<8 or length(url)>1500 or (s.source_type='institution' and url !~ '^https://(www\.)?bls\.gov/') or (s.source_type<>'institution' and url !~ '^https://(www\.)?federalreserve\.gov/') then continue;end if;
 begin published:=item.published::timestamptz;exception when others then published:=null;end;
 if published is null or published>now()+interval '10 minutes' or published<now()-interval '30 days' then continue;end if;
 hash:=encode(sha256(convert_to(url,'UTF8')),'hex');fingerprint:=regexp_replace(lower(ttl),'[^a-z0-9]+','','g');
 if exists(select 1 from public.news_articles n where n.original_url=url or (n.created_at>now()-interval '30 days' and regexp_replace(lower(n.title),'[^a-z0-9]+','','g')=fingerprint)) then dup:=dup+1;continue;end if;
 insert into public.news_articles(news_type,slug,title,content_origin,source_id,source_name,original_url,original_published_at,category_id,market,country,priority,status,needs_review_reason,dedupe_hash,title_fingerprint,is_sample)
 values(s.news_type,'official-'||left(hash,32),ttl,'source_excerpt',s.id,s.name,url,published,s.category_id,case when s.source_type='central_bank' then 'central_banks' when s.source_type='institution' then 'economic_data' else 'other' end,s.country,'normal','pending_review','Official RSS headline and link; editorial verification required',hash,fingerprint,false)
 on conflict do nothing;
 get diagnostics affected=row_count;if affected=1 then ins:=ins+1;else dup:=dup+1;end if;
end loop;
if seen=0 then raise exception 'No RSS items recognized';end if;
return jsonb_build_object('fetched',seen,'inserted',ins,'duplicates',dup);
end;$function$

CREATE OR REPLACE FUNCTION fx_news_private.refresh()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare s record;r record;stats jsonb;failure text;run_uuid uuid;rid bigint; queued int:=0;finished int:=0;failed int:=0;inserted int:=0;
begin
if not pg_try_advisory_xact_lock(788640226) then return '{"status":"busy"}'::jsonb;end if;
if not exists(select 1 from public.scheduled_jobs where key='news_refresh' and enabled) then return '{"status":"disabled"}'::jsonb;end if;
for r in select q.*,n.status_code,n.timed_out,n.error_msg,n.content from fx_news_private.feed_requests q left join net._http_response n on n.id=q.request_id where n.id is not null or q.requested_at<now()-interval '5 minutes' limit 20 loop
 failure:=null;stats:=null;
 begin
 if r.status_code is distinct from 200 or coalesce(r.timed_out,false) or r.error_msg is not null then raise exception 'HTTP fetch failed: %',coalesce(r.status_code::text,'timeout');end if;
 stats:=fx_news_private.ingest_rss(r.source_id,r.content);
 exception when others then failure:=left(sqlerrm,300);end;
 if failure is null then
 update public.news_source_runs set status='success',finished_at=now(),fetched=(stats->>'fetched')::int,inserted=(stats->>'inserted')::int,duplicates=(stats->>'duplicates')::int,queued_for_review=(stats->>'inserted')::int where id=r.run_id;
 update public.news_sources set last_success_at=now(),consecutive_failures=0,last_error=null,locked_until=null,articles_collected=articles_collected+(stats->>'inserted')::int where id=r.source_id;
 finished:=finished+1;inserted:=inserted+(stats->>'inserted')::int;
 else
 update public.news_source_runs set status='failed',finished_at=now(),error=failure where id=r.run_id;
 update public.news_sources set last_failure_at=now(),error_count=error_count+1,consecutive_failures=consecutive_failures+1,last_error=failure,locked_until=null,next_run_at=now()+make_interval(mins=>least(240,15*(consecutive_failures+1))) where id=r.source_id;
 failed:=failed+1;
 end if;
 delete from fx_news_private.feed_requests where request_id=r.request_id;
end loop;
for s in select * from public.news_sources where enabled and collection_permitted and next_run_at<=now() and feed_url in ('https://www.federalreserve.gov/feeds/press_monetary.xml','https://www.federalreserve.gov/feeds/speeches_and_testimony.xml','https://www.federalreserve.gov/feeds/press_bcreg.xml','https://www.bls.gov/feed/bls_latest.rss') and not exists(select 1 from fx_news_private.feed_requests q where q.source_id=news_sources.id) order by next_run_at limit 4 loop
 insert into public.news_source_runs(source_id,trigger) values(s.id,'schedule') returning id into run_uuid;
 rid:=net.http_get(url=>s.feed_url,headers=>'{"Accept":"application/rss+xml, application/xml, text/xml","User-Agent":"FXBrokerUpdates-TestFeed/1.0"}'::jsonb,timeout_milliseconds=>10000);
 insert into fx_news_private.feed_requests(request_id,source_id,run_id) values(rid,s.id,run_uuid);
 update public.news_sources set last_fetched_at=now(),next_run_at=now()+make_interval(mins=>greatest(15,refresh_minutes)),locked_until=now()+interval '5 minutes' where id=s.id;queued:=queued+1;
end loop;
update public.scheduled_jobs set last_run_at=now(),last_status=case when failed>0 then 'failed' else 'success' end,last_error=case when failed>0 then 'See individual source run logs' else null end,next_run_at=now()+interval '5 minutes' where key='news_refresh';
return jsonb_build_object('queued',queued,'finished',finished,'failed',failed,'inserted',inserted);
end;$function$

revoke all on function fx_news_private.ingest_rss(uuid,text) from public,anon,authenticated;
revoke all on function fx_news_private.refresh() from public,anon,authenticated;
