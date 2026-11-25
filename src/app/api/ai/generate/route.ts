import { z } from "zod";
import { getViewer, can } from "@/lib/auth";
import { error, json, parseBody, sameOrigin } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { generateContent, GenerationError, resolveSource } from "@/lib/ai/service";
import { recordServerEvent } from "@/lib/analytics/ingest";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/data/site";

export const maxDuration = 60;

const Body = z.object({
  admin_studio: z.boolean().optional(),
  source_type: z.enum(["article", "topic", "text", "banner_prompt", "video_script"]),
  source_id: z.string().uuid().optional(),
  source_text: z.string().max(8000).optional(),
  options: z.object({
    content_type: z.string().max(40),
    language: z.enum(["en", "ur", "roman_ur", "hi", "ar"]).optional(),
    tone: z.string().max(40).optional(),
    length: z.string().max(20).optional(),
    audience: z.string().max(60).optional(),
    platform: z.string().max(40).optional(),
    duration_seconds: z.number().int().min(10).max(600).optional(),
    aspect_ratio: z.enum(["1:1", "4:5", "9:16", "16:9"]).optional(),
    custom_instructions: z.string().max(1000).optional(),
    include_cta: z.boolean().optional(),
    include_hashtags: z.boolean().optional(),
    brand_name: z.string().max(80).optional(),
    website: z.string().max(120).optional(),
  }),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Forbidden", 403);
  const viewer = await getViewer();
  if (!viewer) return error("Please log in to use the AI Creator Studio.", 401);
  if (viewer.profile?.status !== "active" || !viewer.profile.email_verified_at) return error("An active email-verified account is required.", 403);
  const { data, error: err } = await parseBody(req, Body, 20_000);
  if (!data) return error(err ?? "Invalid input");

  const isAdminStudio = Boolean(data.admin_studio);
  if (isAdminStudio && !(viewer.isStaff && can(viewer, "ai.use_admin"))) return error("Not authorized", 403);
  if (!isAdminStudio) {
    const config = await getSiteConfig();
    if (!config.flags.ai_studio) return error("The AI Creator Studio is disabled.", 403);
    const supabase = await createSupabaseServer();
    const { data: access } = await supabase.from("user_feature_access").select("enabled").eq("user_id", viewer.id).eq("feature_key", "ai_studio").maybeSingle();
    if (access?.enabled === false) return error("AI Creator Studio access has been disabled for your account.", 403);
  }
  if (!(await rateLimit(`ai:${viewer.id}`, 60, isAdminStudio ? 30 : 6))) return error("Please slow down — too many requests per minute.", 429);

  await recordServerEvent(viewer.id, "ai_generation_requested", { feature: "ai_studio", content_type: data.source_type === "article" ? "article" : undefined,
    content_id: data.source_type === "article" ? data.source_id : undefined, metadata: { type: data.options.content_type } });
  try {
    const source = await resolveSource(data.source_type, data.source_id, data.source_text, isAdminStudio && viewer.isStaff);
    const result = await generateContent({ userId: viewer.id, isAdminStudio, options: data.options, source, sourceId: data.source_id });
    await recordServerEvent(viewer.id, "ai_generation_completed", { feature: "ai_studio", content_type: "ai_generation", content_id: result.id, metadata: { type: data.options.content_type } });
    return json(result);
  } catch (e) {
    const ge = e instanceof GenerationError ? e : new GenerationError("AI generation failed.", 500, "failed");
    await recordServerEvent(viewer.id, "ai_generation_failed", { feature: "ai_studio", metadata: { code: ge.code } });
    return json({ error: ge.message, code: ge.code }, ge.status);
  }
}
