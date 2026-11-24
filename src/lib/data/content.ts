import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabasePublic } from "@/lib/supabase/server";
import { isDevelopmentMode } from "@/lib/env";
import { SAMPLE_PROMPTS, SAMPLE_SCRIPTS } from "@/lib/sample-data";
import type { BannerPrompt, VideoScript } from "@/types/db";

export interface LibraryQuery {
  q?: string; category?: string; language?: string; date?: string; aspect?: string; duration?: number; page?: number; pageSize?: number;
}
export interface LibraryResult<T> { items: T[]; total: number; page: number; pageSize: number; full: boolean; isSample: boolean }

/**
 * Prompts library. With a member client (`db`), full prompt text is returned (RLS allows
 * signed-in users). Without it, guests receive truncated previews from banner_prompts_preview.
 */
export async function listPrompts(q: LibraryQuery, db?: SupabaseClient | null): Promise<LibraryResult<BannerPrompt>> {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = q.pageSize ?? 12;
  const client = db ?? createSupabasePublic();
  if (!client) {
    let items = isDevelopmentMode ? SAMPLE_PROMPTS : [];
    if (q.category) items = items.filter((p) => p.category === q.category);
    return { items, total: items.length, page, pageSize, full: false, isSample: true };
  }
  const full = Boolean(db);
  let query = full
    ? client.from("banner_prompts").select("*", { count: "exact" }).eq("status", "published")
    : client.from("banner_prompts_preview").select("*", { count: "exact" });
  if (q.q) query = query.ilike("title", `%${q.q.replace(/[%_]/g, "")}%`);
  if (q.category) query = query.eq("category", q.category);
  if (q.language) query = query.eq("language", q.language);
  if (q.aspect) query = query.eq("aspect_ratio", q.aspect);
  if (q.date) query = query.eq("publish_date", q.date);
  const { data, count } = await query.order("publish_date", { ascending: false }).order("is_featured", { ascending: false })
    .order("published_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  return { items: (data ?? []) as BannerPrompt[], total: count ?? 0, page, pageSize, full, isSample: false };
}

export async function listScripts(q: LibraryQuery, db?: SupabaseClient | null): Promise<LibraryResult<VideoScript>> {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = q.pageSize ?? 12;
  const client = db ?? createSupabasePublic();
  if (!client) {
    let items = isDevelopmentMode ? SAMPLE_SCRIPTS : [];
    if (q.duration) items = items.filter((p) => p.duration_seconds === q.duration);
    return { items, total: items.length, page, pageSize, full: false, isSample: true };
  }
  const full = Boolean(db);
  let query = full
    ? client.from("video_scripts").select("*", { count: "exact" }).eq("status", "published")
    : client.from("video_scripts_preview").select("*", { count: "exact" });
  if (q.q) query = query.ilike("title", `%${q.q.replace(/[%_]/g, "")}%`);
  if (q.language) query = query.eq("language", q.language);
  if (q.duration) query = query.eq("duration_seconds", q.duration);
  if (q.date) query = query.eq("publish_date", q.date);
  const { data, count } = await query.order("publish_date", { ascending: false }).order("is_featured", { ascending: false })
    .order("published_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  return { items: (data ?? []) as VideoScript[], total: count ?? 0, page, pageSize, full, isSample: false };
}
