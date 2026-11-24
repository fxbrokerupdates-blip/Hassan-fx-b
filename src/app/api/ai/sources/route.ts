import { getViewer } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { error, json } from "@/lib/security/http";

/** Lightweight picker data for the studio: published articles, prompts and scripts (search by title). */
export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return error("Please log in", 401);
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "article";
  const q = (url.searchParams.get("q") ?? "").replace(/[%_]/g, "").slice(0, 80);
  const supabase = await createSupabaseServer();
  if (kind === "banner_prompt" || kind === "video_script") {
    const table = kind === "banner_prompt" ? "banner_prompts" : "video_scripts";
    let query = supabase.from(table).select("id,title,publish_date").eq("status", "published");
    if (q) query = query.ilike("title", `%${q}%`);
    const { data } = await query.order("publish_date", { ascending: false }).limit(20);
    return json({ items: (data ?? []).map((d) => ({ id: d.id, title: d.title, meta: d.publish_date })) });
  }
  const typ = url.searchParams.get("news_type");
  let query = supabase.from("news_articles").select("id,title,news_type,published_at").eq("status", "published");
  if (typ === "broker" || typ === "trading") query = query.eq("news_type", typ);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data } = await query.order("published_at", { ascending: false }).limit(20);
  return json({ items: (data ?? []).map((d) => ({ id: d.id, title: d.title, meta: `${d.news_type} · ${d.published_at?.slice(0, 10) ?? ""}` })) });
}
