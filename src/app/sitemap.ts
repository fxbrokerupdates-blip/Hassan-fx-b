import type { MetadataRoute } from "next";
import { createSupabasePublic } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const statics = ["/", "/news", "/broker-updates", "/trading-updates", "/brokers", "/free-tools", "/free-tools/banner-prompts",
    "/free-tools/video-scripts", "/about", "/contact", "/advertise", "/privacy", "/terms", "/disclaimer", "/newsletter"]
    .map((p) => ({ url: absoluteUrl(p), lastModified: now, changeFrequency: "hourly" as const, priority: p === "/" ? 1 : 0.7 }));
  const db = createSupabasePublic();
  if (!db) return statics;
  const [news, brokers, cats] = await Promise.all([
    db.from("news_articles").select("slug,updated_at").eq("status", "published").eq("noindex", false).eq("is_sample", false)
      .order("published_at", { ascending: false }).limit(5000),
    db.from("brokers").select("slug,updated_at").eq("status", "active").eq("is_sample", false).limit(2000),
    db.from("news_categories").select("slug").eq("is_active", true),
  ]);
  return [
    ...statics,
    ...(cats.data ?? []).map((c) => ({ url: absoluteUrl(`/category/${c.slug}`), changeFrequency: "daily" as const, priority: 0.6 })),
    ...(brokers.data ?? []).map((b) => ({ url: absoluteUrl(`/brokers/${b.slug}`), lastModified: b.updated_at, priority: 0.6 })),
    ...(news.data ?? []).map((n) => ({ url: absoluteUrl(`/news/${n.slug}`), lastModified: n.updated_at, priority: 0.8 })),
  ];
}
