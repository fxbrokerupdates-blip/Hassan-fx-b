import { createSupabaseAdmin } from "@/lib/supabase/admin";

/** One-click unsubscribe: /api/newsletter/unsubscribe?token=… (link included in every email). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const admin = createSupabaseAdmin();
  if (admin && /^[a-f0-9]{36}$/.test(token)) {
    await admin.from("newsletter_subscribers").update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }).eq("unsubscribe_token", token);
  }
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Unsubscribed</title><body style="font-family:system-ui;background:#031222;color:#fff;display:grid;place-items:center;min-height:100vh"><div><h1 style="color:#F5C542">You're unsubscribed</h1><p>You will no longer receive newsletter emails.</p><a style="color:#F5C542" href="/">Back to FX Broker Updates</a></div>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
export const POST = GET;
