import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getViewerId } from "@/lib/auth-lite";
import { error, json, parseBody, sameOrigin } from "@/lib/security/http";

const Body = z.object({ broker_id: z.string().uuid(), notify: z.boolean().optional() });

export async function GET(req: Request) {
  const userId = await getViewerId();
  const id = new URL(req.url).searchParams.get("broker_id") ?? "";
  if (!userId || !z.string().uuid().safeParse(id).success) return json({ following: false });
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("favourite_brokers").select("notify").eq("user_id", userId).eq("broker_id", id).maybeSingle();
  return json({ following: Boolean(data), notify: data?.notify ?? false });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Forbidden", 403);
  const userId = await getViewerId();
  if (!userId) return error("Please log in", 401);
  const { data, error: err } = await parseBody(req, Body, 1_000);
  if (!data) return error(err ?? "Invalid input");
  const supabase = await createSupabaseServer();
  const { error: dbErr } = await supabase.from("favourite_brokers")
    .upsert({ user_id: userId, broker_id: data.broker_id, notify: data.notify ?? true }, { onConflict: "user_id,broker_id" });
  if (dbErr) return error("Could not follow broker", 500);
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return error("Forbidden", 403);
  const userId = await getViewerId();
  if (!userId) return error("Please log in", 401);
  const { data, error: err } = await parseBody(req, Body, 1_000);
  if (!data) return error(err ?? "Invalid input");
  const supabase = await createSupabaseServer();
  await supabase.from("favourite_brokers").delete().eq("user_id", userId).eq("broker_id", data.broker_id);
  return json({ ok: true });
}
