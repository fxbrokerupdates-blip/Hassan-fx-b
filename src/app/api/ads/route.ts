import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { clientKey, memoryRateLimit } from "@/lib/security/rate-limit";
import { error, json, parseBody } from "@/lib/security/http";

const Body = z.object({ id: z.string().uuid(), type: z.enum(["impression", "click"]) });

/** Advertisement impression/click counter (rate limited, no personal data). */
export async function POST(req: Request) {
  if (!memoryRateLimit(`ad:${clientKey(req)}`, 60, 60)) return error("Too many requests", 429);
  const { data } = await parseBody(req, Body, 500);
  if (!data) return error("Invalid input");
  const admin = createSupabaseAdmin();
  if (!admin) return json({ ok: false }, 202);
  await admin.from("advertisement_events").insert({ ad_id: data.id, event_type: data.type });
  const col = data.type === "click" ? "clicks" : "impressions";
  const { data: ad } = await admin.from("advertisements").select(col).eq("id", data.id).maybeSingle();
  if (ad) await admin.from("advertisements").update({ [col]: Number((ad as Record<string, number>)[col] ?? 0) + 1 }).eq("id", data.id);
  return json({ ok: true });
}
