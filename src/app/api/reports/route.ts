import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getViewerId } from "@/lib/auth-lite";
import { rateLimit } from "@/lib/security/rate-limit";
import { error, json, parseBody, sameOrigin } from "@/lib/security/http";

const Body = z.object({
  content_type: z.enum(["article", "banner_prompt", "video_script", "broker"]),
  content_id: z.string().uuid(),
  reason: z.enum(["incorrect", "outdated", "broken_link", "copyright", "inappropriate", "other"]),
  details: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Forbidden", 403);
  const userId = await getViewerId();
  if (!userId) return error("Please log in", 401);
  if (!(await rateLimit(`report:${userId}`, 3600, 10))) return error("Too many reports", 429);
  const { data, error: err } = await parseBody(req, Body, 4_000);
  if (!data) return error(err ?? "Invalid input");
  const supabase = await createSupabaseServer();
  const { error: dbErr } = await supabase.from("content_reports").insert({ ...data, user_id: userId });
  if (dbErr) return error("Could not submit report", 500);
  return json({ ok: true });
}
