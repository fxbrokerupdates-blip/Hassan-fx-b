import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getViewerId } from "@/lib/auth-lite";
import { clientKey, memoryRateLimit } from "@/lib/security/rate-limit";
import { error, json, parseBody } from "@/lib/security/http";
import { featureFromPath, sanitizePath } from "@/lib/analytics/events";
import { countryFromHeaders, parseUserAgent } from "@/lib/analytics/server";
import { getTrackingSettings, memberTrackingAllowed } from "@/lib/analytics/ingest";

export const dynamic = "force-dynamic";

const Body = z.object({
  session_id: z.string().uuid(),
  visitor_id: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/).nullable().optional(),
  tab_id: z.string().regex(/^[a-zA-Z0-9-]{4,40}$/),
  path: z.string().max(400),
  feature: z.string().max(60).optional(),
  visible: z.boolean(),
  interacted: z.boolean(),
  engaged_delta: z.number().int().min(0).max(3600),
});

/** Presence heartbeat (~every 45s while visible). One presence row per person, never per tab. */
export async function POST(req: Request) {
  const admin = createSupabaseAdmin();
  if (!admin) return json({ ok: false, reason: "analytics_not_configured" }, 202);
  if (!memoryRateLimit(`hb:${clientKey(req)}`, 60, 60)) return error("Too many requests", 429);
  const settings = await getTrackingSettings();
  if (!settings.enabled) return json({ ok: true, skipped: true }, 202);

  const { data, error: err } = await parseBody(req, Body, 4_000);
  if (!data) return error(err ?? "Invalid payload");
  const ua = parseUserAgent(req.headers.get("user-agent"));
  if (ua.device === "bot") return json({ ok: true, skipped: "bot" }, 202);

  let userId = await getViewerId();
  if (userId && !(await memberTrackingAllowed(userId))) userId = null;
  const presenceKey = userId ? `u:${userId}` : `a:${data.visitor_id ?? data.session_id.replace(/-/g, "")}`;
  const path = sanitizePath(data.path);
  const { data: result, error: rpcErr } = await admin.rpc("analytics_heartbeat", {
    p: {
      presence_key: presenceKey, user_id: userId, session_id: data.session_id, tab_id: data.tab_id, path,
      feature: featureFromPath(path.split("?")[0]), visible: data.visible, interacted: data.interacted,
      engaged_delta: data.engaged_delta, interval_seconds: settings.heartbeat_seconds, idle_seconds: settings.idle_seconds,
      device_category: ua.device, browser: ua.browser, country: countryFromHeaders(req.headers),
    },
  });
  if (rpcErr) return error("Heartbeat failed", 500);
  return json(result ?? { ok: true });
}
