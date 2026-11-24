import { createSupabasePublic } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 300;

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** Google News sitemap — articles published in the last 48 hours. */
export async function GET() {
  const db = createSupabasePublic();
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data } = db
    ? await db.from("news_articles").select("slug,title,published_at").eq("status", "published").eq("is_sample", false)
        .eq("noindex", false).gte("published_at", since).order("published_at", { ascending: false }).limit(1000)
    : { data: [] as { slug: string; title: string; published_at: string }[] };
  const items = (data ?? []).map((a) => `<url><loc>${absoluteUrl(`/news/${a.slug}`)}</loc><news:news><news:publication><news:name>FX Broker Updates</news:name><news:language>en</news:language></news:publication><news:publication_date>${a.published_at}</news:publication_date><news:title>${esc(a.title)}</news:title></news:news></url>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items}</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
