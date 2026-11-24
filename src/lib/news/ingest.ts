import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeFetch, SsrfError } from "@/lib/news/ssrf";
import { fingerprint, jaccard, normalizeDate, normalizeUrl, parseFeed, titleTokens, urlHash } from "@/lib/news/parse";
import { classify } from "@/lib/news/classify";
import { slugify, truncate } from "@/lib/utils";

interface Source {
  id: string; name: string; feed_url: string; news_type: "broker" | "trading"; category_id: string | null; broker_id: string | null;
  country: string | null; refresh_minutes: number; trusted: boolean; auto_publish: boolean; consecutive_failures: number;
  error_count: number; articles_collected: number; etag: string | null; last_modified: string | null;
}
interface PipelineSettings { fetch_timeout_ms: number; max_items_per_source: number; high_risk_keywords: string[]; hot_keywords: string[]; similarity_threshold: number }

export interface RunResult { sourceId: string; status: "success" | "failed" | "skipped"; fetched: number; inserted: number; duplicates: number; review: number; error?: string }

/**
 * Collection → validation → normalization → duplicate detection → classification → (review or publish).
 * Stores only the headline, a short source excerpt (≤300 chars) and the original link — never the full article.
 */
export async function ingestSource(db: SupabaseClient, source: Source, settings: PipelineSettings, trigger: "schedule" | "manual" = "schedule"): Promise<RunResult> {
  const { data: run } = await db.from("news_source_runs").insert({ source_id: source.id, trigger }).select("id").single();
  const result: RunResult = { sourceId: source.id, status: "success", fetched: 0, inserted: 0, duplicates: 0, review: 0 };
  try {
    const headers: Record<string, string> = {};
    if (source.etag) headers["If-None-Match"] = source.etag;
    if (source.last_modified) headers["If-Modified-Since"] = source.last_modified;
    const res = await safeFetch(source.feed_url, { timeoutMs: settings.fetch_timeout_ms, headers });
    if (res.status === 304) {
      result.status = "skipped";
    } else if (res.status === 429) {
      throw Object.assign(new Error("Rate limited by source (429)"), { http: 429 });
    } else if (res.status >= 400) {
      throw Object.assign(new Error(`HTTP ${res.status}`), { http: res.status });
    } else {
      const items = parseFeed(res.body).slice(0, settings.max_items_per_source);
      result.fetched = items.length;
      const [{ data: brokers }, { data: recent }] = await Promise.all([
        db.from("brokers").select("id,name").eq("status", "active").limit(2000),
        db.from("news_articles").select("title,title_fingerprint").gte("created_at", new Date(Date.now() - 3 * 86400_000).toISOString()).limit(3000),
      ]);
      const recentTokens = (recent ?? []).map((r) => titleTokens(r.title));
      for (const item of items) {
        // validation
        if (!item.title || item.title.length < 8 || !/^https?:\/\//.test(item.link)) continue;
        const link = normalizeUrl(item.link);
        const hash = urlHash(link);
        const tokens = titleTokens(item.title);
        // similar-story detection across sources
        if (recentTokens.some((t) => jaccard(t, tokens) >= settings.similarity_threshold)) { result.duplicates++; continue; }
        const c = classify({ title: item.title, summary: item.summary, trusted: source.trusted, newsType: source.news_type,
          brokers: brokers ?? [], hotKeywords: settings.hot_keywords, riskKeywords: settings.high_risk_keywords });
        const publish = source.auto_publish && source.trusted && !c.highRisk;
        const base = slugify(item.title, 120) || "news";
        const row = {
          news_type: source.news_type, slug: `${base}-${hash.slice(0, 6)}`, title: truncate(item.title, 300),
          summary: truncate(item.summary, 300) || null, content: null, content_origin: "source_excerpt",
          category_id: source.category_id, broker_id: source.broker_id ?? c.brokerId, market: c.market, country: source.country,
          source_id: source.id, source_name: source.name, original_url: link, original_published_at: normalizeDate(item.publishedAt),
          author_name: item.author ? truncate(item.author, 120) : null, priority: c.priority,
          status: publish ? "published" : "pending_review", needs_review_reason: c.reasons.join("; ") || (publish ? null : "Untrusted or non-auto-publish source"),
          published_at: publish ? new Date().toISOString() : null, dedupe_hash: hash, title_fingerprint: fingerprint(item.title), show_on_home: true,
        };
        const { error } = await db.from("news_articles").insert(row);
        if (error) { if (error.code === "23505") result.duplicates++; else throw error; continue; }
        recentTokens.push(tokens);
        result.inserted++;
        if (!publish) result.review++;
      }
    }
    await db.from("news_sources").update({
      last_fetched_at: new Date().toISOString(), last_success_at: new Date().toISOString(), consecutive_failures: 0, locked_until: null,
      articles_collected: source.articles_collected + result.inserted, etag: res.headers.get("etag") ?? source.etag,
      last_modified: res.headers.get("last-modified") ?? source.last_modified,
      next_run_at: new Date(Date.now() + source.refresh_minutes * 60_000).toISOString(),
    }).eq("id", source.id);
  } catch (e) {
    const err = e as Error & { http?: number };
    result.status = "failed";
    result.error = e instanceof SsrfError ? `Blocked: ${err.message}` : err.message?.slice(0, 300) ?? "Unknown error";
    const failures = source.consecutive_failures + 1;
    const backoff = source.refresh_minutes * Math.pow(2, Math.min(failures, 6)); // exponential backoff, capped
    await db.from("news_sources").update({
      last_fetched_at: new Date().toISOString(), last_failure_at: new Date().toISOString(), last_error: result.error,
      error_count: source.error_count + 1, consecutive_failures: failures, locked_until: null,
      next_run_at: new Date(Date.now() + Math.min(backoff, 1440) * 60_000).toISOString(),
    }).eq("id", source.id);
    await db.from("news_source_errors").insert({ source_id: source.id, run_id: run?.id ?? null, message: result.error, http_status: err.http ?? null });
  }
  if (run) {
    await db.from("news_source_runs").update({
      finished_at: new Date().toISOString(), status: result.status === "skipped" ? "skipped" : result.status, fetched: result.fetched,
      inserted: result.inserted, duplicates: result.duplicates, queued_for_review: result.review, error: result.error ?? null,
    }).eq("id", run.id);
  }
  return result;
}

export async function loadPipelineSettings(db: SupabaseClient): Promise<PipelineSettings & { max_sources_per_run: number }> {
  const { data } = await db.from("website_settings").select("value").eq("key", "news.pipeline").maybeSingle();
  const v = (data?.value ?? {}) as Partial<PipelineSettings & { max_sources_per_run: number }>;
  return {
    fetch_timeout_ms: Math.min(Math.max(v.fetch_timeout_ms ?? 10_000, 2000), 30_000),
    max_items_per_source: Math.min(Math.max(v.max_items_per_source ?? 30, 1), 100),
    high_risk_keywords: v.high_risk_keywords ?? [], hot_keywords: v.hot_keywords ?? [],
    similarity_threshold: v.similarity_threshold ?? 0.82, max_sources_per_run: Math.min(Math.max(v.max_sources_per_run ?? 15, 1), 50),
  };
}
