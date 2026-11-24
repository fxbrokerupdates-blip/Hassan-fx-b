import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getViewerId } from "@/lib/auth-lite";
import { error, json, parseBody, sameOrigin } from "@/lib/security/http";

const Body = z.object({
  content_type: z.enum(["article", "banner_prompt", "video_script", "ai_generation", "broker"]),
  content_id: z.string().uuid(),
  title: z.string().max(300).optional(),
});

async function guard(req: Request) {
  if (!sameOrigin(req)) return { res: error("Forbidden", 403) };
  const userId = await getViewerId();
  if (!userId) return { res: error("Please log in", 401) };
  const { data, error: err } = await parseBody(req, Body, 2_000);
  if (!data) return { res: error(err ?? "Invalid input") };
  return { userId, data };
}

/** Save an item. RLS guarantees users can only write their own rows. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const supabase = await createSupabaseServer();
  const { error: dbErr } = await supabase.from("saved_content")
    .upsert({ user_id: g.userId, content_type: g.data!.content_type, content_id: g.data!.content_id, title: g.data!.title ?? null },
      { onConflict: "user_id,content_type,content_id", ignoreDuplicates: true });
  if (dbErr) return error("Could not save", 500);
  if (g.data!.content_type === "ai_generation") {
    await supabase.from("ai_generations").update({ is_saved: true }).eq("id", g.data!.content_id).eq("user_id", g.userId!);
  }
  return json({ ok: true, saved: true });
}

export async function DELETE(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const supabase = await createSupabaseServer();
  await supabase.from("saved_content").delete().eq("user_id", g.userId!).eq("content_type", g.data!.content_type).eq("content_id", g.data!.content_id);
  if (g.data!.content_type === "ai_generation") {
    await supabase.from("ai_generations").update({ is_saved: false }).eq("id", g.data!.content_id).eq("user_id", g.userId!);
  }
  return json({ ok: true, saved: false });
}
