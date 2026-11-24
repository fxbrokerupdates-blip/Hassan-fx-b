import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS } from "@/lib/defaults";

type Tracking = (typeof DEFAULT_SETTINGS)["analytics.tracking"];
let cache: { at: number; value: Tracking } | null = null;

/** Tracking settings with a 60s per-instance cache (hot path). */
export async function getTrackingSettings(): Promise<Tracking> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const admin = createSupabaseAdmin();
  let value = DEFAULT_SETTINGS["analytics.tracking"];
  if (admin) {
    const { data } = await admin.from("website_settings").select("value").eq("key", "analytics.tracking").maybeSingle();
    if (data?.value) value = { ...value, ...(data.value as Partial<Tracking>) };
  }
  cache = { at: Date.now(), value };
  return value;
}

const prefCache = new Map<string, { at: number; allowed: boolean }>();
/** Members can opt out of personal activity tracking in Settings → Privacy. */
export async function memberTrackingAllowed(userId: string): Promise<boolean> {
  const hit = prefCache.get(userId);
  if (hit && Date.now() - hit.at < 120_000) return hit.allowed;
  const admin = createSupabaseAdmin();
  let allowed = true;
  if (admin) {
    const { data } = await admin.from("user_preferences").select("analytics_consent").eq("user_id", userId).maybeSingle();
    allowed = data?.analytics_consent !== false;
  }
  prefCache.set(userId, { at: Date.now(), allowed });
  if (prefCache.size > 5000) prefCache.clear();
  return allowed;
}

/** Records a server-side event (login, registration, AI generation…). Best effort. */
export async function recordServerEvent(userId: string | null, name: string, data: {
  feature?: string; content_type?: string; content_id?: string; metadata?: Record<string, unknown>;
} = {}) {
  const admin = createSupabaseAdmin();
  if (!admin) return;
  if (userId && !(await memberTrackingAllowed(userId))) userId = null;
  await admin.from("analytics_events").insert({
    event_id: randomUUID(), event_name: name, user_id: userId, feature: data.feature ?? null,
    content_type: data.content_type ?? null, content_id: data.content_id ?? null, metadata: data.metadata ?? {},
  }).then(({ error }) => { if (error) console.error("[analytics] server event failed", error.message); });
}

/** De-duplication windows (seconds) for repeat-prone events. */
export const DEDUPE_WINDOWS: Record<string, number> = {
  banner_prompt_copy: 10, video_script_copy: 10, ai_output_copy: 10,
  banner_prompt_view: 1800, video_script_view: 1800, article_open: 1800, broker_view: 1800,
  article_engaged: 86400,
};
