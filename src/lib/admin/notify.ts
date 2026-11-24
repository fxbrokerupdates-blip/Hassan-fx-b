import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Audience =
  | { type: "all" } | { type: "segment"; segment_id: string } | { type: "broker_followers"; broker_id: unknown }
  | { type: "market"; market: unknown } | { type: "user"; user_id: string };

/** Creates an in-app notification and fans it out immediately (idempotent via dedupe key). */
export async function createNotification(n: {
  title: string; body: string | null; link: string | null; category: string; audience: Audience; dedupeKey?: string; scheduledAt?: string | null;
}): Promise<{ id?: string; recipients?: number; error?: string }> {
  const supabase = await createSupabaseServer();
  if (n.dedupeKey) {
    const { data: existing } = await supabase.from("notifications").select("id").eq("dedupe_key", n.dedupeKey).maybeSingle();
    if (existing) return { id: existing.id, recipients: 0 };
  }
  const { data, error } = await supabase.from("notifications").insert({
    title: n.title, body: n.body, link: n.link, category: n.category, audience: n.audience, dedupe_key: n.dedupeKey ?? null,
    status: n.scheduledAt ? "scheduled" : "draft", scheduled_at: n.scheduledAt ?? null,
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Could not create notification" };
  if (n.scheduledAt) return { id: data.id, recipients: 0 };
  const { data: count, error: e2 } = await supabase.rpc("deliver_notification", { p_notification: data.id });
  return e2 ? { id: data.id, error: e2.message } : { id: data.id, recipients: Number(count ?? 0) };
}
