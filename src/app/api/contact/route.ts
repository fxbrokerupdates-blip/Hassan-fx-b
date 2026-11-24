import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getViewerId } from "@/lib/auth-lite";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { error, json, parseBody, sameOrigin } from "@/lib/security/http";
import { verifyBotToken } from "@/lib/security/turnstile";

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  kind: z.enum(["contact", "support", "correction", "partnership"]).default("contact"),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(5, "Message is too short").max(5000),
  hp: z.string().max(0).optional(),
  "cf-turnstile-response": z.string().optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Forbidden", 403);
  if (!(await rateLimit(`contact:${clientKey(req)}`, 3600, 5))) return error("Too many messages. Please try later.", 429);
  const { data, error: err } = await parseBody(req, Body, 12_000);
  if (!data) return error(err ?? "Invalid input");
  if (!(await verifyBotToken(data["cf-turnstile-response"]))) return error("Bot verification failed", 400);
  const admin = createSupabaseAdmin();
  if (!admin) return error("Messaging is not configured yet.", 503);
  const { error: dbErr } = await admin.from("contact_messages").insert({
    name: data.name, email: data.email, kind: data.kind, subject: data.subject, message: data.message, user_id: await getViewerId(),
  });
  if (dbErr) return error("Could not send message.", 500);
  return json({ ok: true });
}
