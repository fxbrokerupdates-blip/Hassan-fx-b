import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { error, json, parseBody, sameOrigin } from "@/lib/security/http";

const Body = z.object({
  company: z.string().trim().min(1).max(160),
  contact_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  website_url: z.union([z.string().trim().url().max(300), z.literal("")]).optional(),
  budget: z.string().max(60).optional(),
  message: z.string().trim().min(5).max(5000),
  hp: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Forbidden", 403);
  if (!(await rateLimit(`adv:${clientKey(req)}`, 3600, 5))) return error("Too many messages. Please try later.", 429);
  const { data, error: err } = await parseBody(req, Body, 12_000);
  if (!data) return error(err ?? "Invalid input");
  const admin = createSupabaseAdmin();
  if (!admin) return error("Enquiries are not configured yet.", 503);
  const { error: dbErr } = await admin.from("advertising_enquiries").insert({
    company: data.company, contact_name: data.contact_name, email: data.email, website: data.website_url || null,
    budget: data.budget || null, message: data.message,
  });
  if (dbErr) return error("Could not send enquiry.", 500);
  return json({ ok: true });
}
