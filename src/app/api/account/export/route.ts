import { createSupabaseServer } from "@/lib/supabase/server";
import { getViewerId } from "@/lib/auth-lite";
import { rateLimit } from "@/lib/security/rate-limit";

/** Self-service data export (GDPR-style access request). Returns only the caller's own rows (RLS). */
export async function GET() {
  const userId = await getViewerId();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  if (!(await rateLimit(`export:${userId}`, 3600, 3))) return new Response("Too many exports, try later.", { status: 429 });
  const s = await createSupabaseServer();
  const [profile, prefs, notif, consents, saved, collections, favs, gens, notes, activity] = await Promise.all([
    s.from("profiles").select("*").eq("id", userId).maybeSingle(),
    s.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    s.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
    s.from("user_consents").select("*").eq("user_id", userId),
    s.from("saved_content").select("*").eq("user_id", userId),
    s.from("user_collections").select("*").eq("user_id", userId),
    s.from("favourite_brokers").select("*").eq("user_id", userId),
    s.from("ai_generations").select("*").eq("user_id", userId),
    s.from("user_notifications").select("*").eq("user_id", userId),
    s.from("daily_user_activity").select("*").eq("user_id", userId),
  ]);
  await s.from("account_requests").insert({ user_id: userId, request_type: "data_export", status: "completed", processed_at: new Date().toISOString() });
  const body = JSON.stringify({
    exported_at: new Date().toISOString(), profile: profile.data, preferences: prefs.data, notification_preferences: notif.data,
    consents: consents.data, saved_content: saved.data, collections: collections.data, favourite_brokers: favs.data,
    ai_generations: gens.data, notifications: notes.data, daily_activity_summary: activity.data,
  }, null, 2);
  return new Response(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="fx-broker-updates-data-${userId}.json"`, "Cache-Control": "no-store" } });
}
