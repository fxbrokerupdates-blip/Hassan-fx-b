import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getViewerId } from "@/lib/auth-lite";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { error, json, parseBody, sameOrigin } from "@/lib/security/http";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(200),
  consent: z.literal(true, { message: "Please confirm you agree to receive emails" }),
  source: z.string().max(40).optional(),
  website: z.string().max(0, "Invalid submission").optional(), // honeypot
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Forbidden", 403);
  if (!(await rateLimit(`nl:${clientKey(req)}`, 3600, 8))) return error("Too many attempts. Please try later.", 429);
  const { data, error: err } = await parseBody(req, Body, 2_000);
  if (!data) return error(err ?? "Invalid input");
  const admin = createSupabaseAdmin();
  if (!admin) return error("Newsletter is not configured yet.", 503);
  const userId = await getViewerId();
  const { error: dbErr } = await admin.from("newsletter_subscribers").upsert({
    email: data.email, user_id: userId, status: "subscribed", consent_source: (data.source ?? "footer").slice(0, 40),
    consent_text: "I agree to receive email updates and accept the Privacy Policy.", consent_at: new Date().toISOString(), unsubscribed_at: null,
  }, { onConflict: "email" });
  if (dbErr) return error("Could not subscribe right now.", 500);
  if (userId) await admin.from("user_consents").insert({ user_id: userId, consent_type: "marketing", granted: true, source: data.source ?? "footer" });
  // Same response whether or not the address already existed (no account enumeration).
  return json({ ok: true, message: "Thanks! You're subscribed." });
}
