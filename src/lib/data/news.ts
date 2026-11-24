import "server-only";
import { cache } from "react";
import { createSupabasePublic } from "@/lib/supabase/server";
import { isDevelopmentMode } from "@/lib/env";
import { SAMPLE_ARTICLES, SAMPLE_BROKERS } from "@/lib/sample-data";
import { DEFAULT_CATEGORIES } from "@/lib/defaults";
import type { Article, Priority } from "@/types/db";

export const ARTICLE_LIST_FIELDS =
  "id,news_type,slug,title,summary,featured_image_url,category_id,broker_id,market,market_impact,country,source_name,original_url,priority,status,published_at,updated_at,is_featured,reading_minutes,is_sample,view_count,author_name,content_origin,key_highlights,noindex,canonical_url,seo_title,seo_description,original_published_at,content,category:news_categories(slug,name),broker:brokers(slug,name)";

export interface NewsQuery {
  type?: "broker" | "trading" | "all";
  category?: string;      // category slug
  market?: string;
  broker?: string;        // broker slug
  priority?: Priority;
  impact?: "high" | "medium" | "low";
  source?: string;
  country?: string;
  q?: string;
  from?: string;          // ISO date
  to?: string;
  featured?: boolean;
  trending?: boolean;     // most viewed in the last 7 days
  page?: number;
  pageSize?: number;
}

export interface NewsResult {
  items: Article[];
  total: number;
  page: number;
  pageSize: number;
  isSample: boolean;
  error?: string;
}

function sampleQuery(q: NewsQuery): NewsResult {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = q.pageSize ?? 12;
  let items = SAMPLE_ARTICLES.filter((a) => (q.type && q.type !== "all" ? a.news_type === q.type : true));
  if (q.category) items = items.filter((a) => a.category?.slug === q.category);
  if (q.market) items = items.filter((a) => a.market === q.market);
  if (q.broker) items = items.filter((a) => a.broker?.slug === q.broker);
  if (q.priority) items = items.filter((a) => a.priority === q.priority);
  if (q.featured) items = items.filter((a) => a.is_featured);
  if (q.q) items = items.filter((a) => a.title.toLowerCase().includes(q.q!.toLowerCase()));
  items = [...items].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize, isSample: true };
}

/** Public news listing with filters, latest-first, paginated. RLS returns published items only. */
export async function listNews(q: NewsQuery): Promise<NewsResult> {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(48, q.pageSize ?? 12);
  const db = createSupabasePublic();
  if (!db) return isDevelopmentMode ? sampleQuery(q) : { items: [], total: 0, page, pageSize, isSample: false };

  let query = db.from("news_articles").select(ARTICLE_LIST_FIELDS, { count: "exact" }).eq("status", "published");
  if (q.type && q.type !== "all") query = query.eq("news_type", q.type);
  if (q.market) query = query.eq("market", q.market);
  if (q.priority) query = query.eq("priority", q.priority);
  if (q.impact) query = query.eq("market_impact", q.impact);
  if (q.country) query = query.eq("country", q.country.toUpperCase());
  if (q.source) query = query.ilike("source_name", `%${q.source.replace(/[%_]/g, "")}%`);
  if (q.featured) query = query.eq("is_featured", true);
  if (q.from) query = query.gte("published_at", q.from);
  if (q.to) query = query.lte("published_at", `${q.to}T23:59:59Z`);
  if (q.q) query = query.textSearch("search", q.q.slice(0, 120), { type: "websearch", config: "simple" });
  if (q.category) {
    const { data: c } = await db.from("news_categories").select("id").eq("slug", q.category).maybeSingle();
    query = query.eq("category_id", c?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (q.broker) {
    const { data: b } = await db.from("brokers").select("id").eq("slug", q.broker).maybeSingle();
    query = query.eq("broker_id", b?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (q.trending) {
    query = query.gte("published_at", new Date(Date.now() - 7 * 86400_000).toISOString()).order("view_count", { ascending: false });
  }
  query = query.order("published_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error("[news] list failed", error.message);
    return { items: [], total: 0, page, pageSize, isSample: false, error: "News could not be loaded." };
  }
  return { items: (data ?? []) as unknown as Article[], total: count ?? 0, page, pageSize, isSample: false };
}

export const getArticle = cache(async (slug: string): Promise<Article | null> => {
  const db = createSupabasePublic();
  if (!db) return isDevelopmentMode ? (SAMPLE_ARTICLES.find((a) => a.slug === slug) ?? null) : null;
  const { data } = await db.from("news_articles").select(ARTICLE_LIST_FIELDS).eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as unknown as Article) ?? null;
});

export async function getRelated(article: Article, limit = 4): Promise<Article[]> {
  const db = createSupabasePublic();
  if (!db) return SAMPLE_ARTICLES.filter((a) => a.id !== article.id && a.news_type === article.news_type).slice(0, limit);
  let q = db.from("news_articles").select(ARTICLE_LIST_FIELDS).eq("status", "published").neq("id", article.id);
  if (article.broker_id) q = q.eq("broker_id", article.broker_id);
  else if (article.market) q = q.eq("market", article.market);
  else if (article.category_id) q = q.eq("category_id", article.category_id);
  else q = q.eq("news_type", article.news_type);
  const { data } = await q.order("published_at", { ascending: false }).limit(limit);
  let rows = (data ?? []) as unknown as Article[];
  if (rows.length < limit) {
    const { data: more } = await db.from("news_articles").select(ARTICLE_LIST_FIELDS).eq("status", "published")
      .eq("news_type", article.news_type).neq("id", article.id).order("published_at", { ascending: false }).limit(limit);
    const seen = new Set(rows.map((r) => r.id));
    rows = [...rows, ...((more ?? []) as unknown as Article[]).filter((r) => !seen.has(r.id))].slice(0, limit);
  }
  return rows;
}

export async function getHomeNews(perPanel = 3) {
  const [broker, trading] = await Promise.all([
    listNews({ type: "broker", pageSize: perPanel + 1 }),
    listNews({ type: "trading", pageSize: perPanel + 1 }),
  ]);
  return { broker: broker.items, trading: trading.items, isSample: broker.isSample || trading.isSample };
}

export function sampleBrokers() {
  return isDevelopmentMode ? SAMPLE_BROKERS : [];
}
export const ALL_CATEGORIES = DEFAULT_CATEGORIES;
