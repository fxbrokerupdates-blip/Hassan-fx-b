import "server-only";
import { getViewer } from "@/lib/auth";
import { getSiteConfig } from "@/lib/data/site";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Global feature flag AND per-user feature access (admin can disable a feature for one member). */
export async function memberFeatureEnabled(key: "banner_prompts" | "video_scripts" | "ai_studio"): Promise<boolean> {
  const [config, viewer] = await Promise.all([getSiteConfig(), getViewer()]);
  if (!config.flags[key]) return false;
  if (!viewer) return true;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("user_feature_access").select("enabled").eq("user_id", viewer.id).eq("feature_key", key).maybeSingle();
  return data?.enabled !== false;
}
