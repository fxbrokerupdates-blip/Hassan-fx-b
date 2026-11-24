import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getViewerId } from "@/lib/auth-lite";
import { clientKey, memoryRateLimit } from "@/lib/security/rate-limit";
import { error, json, parseBody } from "@/lib/security/http";
import { CONTENT_TYPES, EVENT_SET, sanitizePath } from "@/lib/analytics/events";
import { countryFromHeaders, parseUserAgent, referrerHost, sanitizeMetadata, trafficSource } from "@/lib/analytics/server";
import { DEDUPE_WINDOWS, getTrackingSettings, memberTrackingAllowed } from "@/lib/analytics/ingest";

export const dynamic = "force-dynamic";

const uuid = z.string().uuid();
const Body = z.object({
  session_id: uuid,
  visitor_id: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/).nullable().optional(),
  landing_path: z.string().max(400).optional(),
  referrer: z.string().max(500).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  events: z.array(z.object({
    event_id: uuid,
    event_name: z.string().max(60),
    feature: z.string().max(60).optional(),
    content_type: z.string().max(40).optional(),
    content_id: uuid.optional(),
    path: z.string().max(400),
    engaged_seconds: z.number().int().min(0).max(86400).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    occurred_at: z.string().max(40).optional(),
  })).min(1).max(25),
});

/** First-party event ingestion. Only whitelisted events are stored; no IPs, form values or clipboard data. */
export async function POST(req: Request) {
  const admin = createSupabaseAdmin();
  if (!admin) return json({ ok: false, reason: "analytics_not_configured" }, 202);
  if (!memoryRateLimit(`track:${clientKey(req)}`, 60, 240)) return error("Too many requests", 429);

  const settings = await getTrackingSettings();
  if (!settings.enabled) return json({ ok: true, skipped: true }, 202);

  const { data, error: err } = await parseBody(req, Body, 32_000);
  if (!data) return error(err ?? "Invalid payload");

  const ua = parseUserAgent(req.headers.get("user-agent"));
  if (ua.device === "bot") return json({ ok: true, skipped: "bot" }, 202);

  let userId = await getViewerId();
  if (userId && !(await memberTrackingAllowed(userId))) userId = null;
  const actor = userId ?? data.visitor_id ?? data.session_id;
  const siteHost = req.headers.get("host") ?? "";
  const ref = referrerHost(data.referrer);
  const now = Math.floor(Date.now() / 1000);

  const events = data.events
    .filter((e) => EVENT_SET.has(e.event_name))
    .map((e) => {
      const win = DEDUPE_WINDOWS[e.event_name];
      return {
        event_id: e.event_id,
        event_name: e.event_name,
        feature: e.feature?.replace(/[^a-z_]/g, "").slice(0, 40),
        content_type: e.content_type && CONTENT_TYPES.has(e.content_type) ? e.content_type : undefined,
        content_id: e.content_id,
        path: sanitizePath(e.path),
        engaged_seconds: e.engaged_seconds,
        metadata: sanitizeMetadata(e.metadata),
        occurred_at: e.occurred_at,
        dedupe_key: win && e.content_id ? `${e.event_name}|${actor}|${e.content_id}|${Math.floor(now / win)}` : undefined,
      };
    });
  if (!events.length) return json({ ok: true, inserted: 0 });

  const session = {
    id: data.session_id,
    user_id: userId,
    visitor_id: data.visitor_id ?? null,
    landing_path: data.landing_path ? sanitizePath(data.landing_path) : null,
    referrer_host: ref,
    traffic_source: trafficSource(ref, siteHost, data.utm_medium),
    utm_source: data.utm_source, utm_medium: data.utm_medium, utm_campaign: data.utm_campaign,
    device_category: ua.device, browser: ua.browser, os: ua.os,
    country: countryFromHeaders(req.headers),
  };
  const { data: inserted, error: rpcErr } = await admin.rpc("analytics_ingest", { p_session: session, p_events: events });
  if (rpcErr) {
    console.error("[track] ingest failed", rpcErr.message);
    return error("Could not record events", 500);
  }
  return json({ ok: true, inserted });
}
