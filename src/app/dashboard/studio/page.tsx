import { notFound } from "next/navigation";
import { Studio } from "@/components/studio/studio";
import { requireUser } from "@/lib/auth";
import { memberFeatureEnabled } from "@/lib/features";
import { getAiSettings } from "@/lib/ai/service";
import { isProviderConfigured } from "@/lib/ai/providers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { PROVIDERS } from "@/lib/ai/catalog";
import { str, type RawParams } from "@/lib/params";

export const metadata = { title: "AI Creator Studio" };

export default async function StudioPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const viewer = await requireUser("/dashboard/studio");
  if (!(await memberFeatureEnabled("ai_studio"))) notFound();
  const sp = await searchParams;
  const settings = await getAiSettings();
  const ready = Boolean(settings?.enabled && settings.member_enabled &&
    (isProviderConfigured(settings.active_provider) || (settings.fallback_provider && isProviderConfigured(settings.fallback_provider))));
  let initial: { kind: "broker" | "trading"; item: { id: string; title: string } } | undefined;
  const id = str(sp, "id", 40);
  if (str(sp, "source") === "article" && id && /^[0-9a-f-]{36}$/.test(id)) {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.from("news_articles").select("id,title,news_type").eq("id", id).eq("status", "published").maybeSingle();
    if (data) initial = { kind: data.news_type, item: { id: data.id, title: data.title } };
  }
  const admin = createSupabaseAdmin();
  const quota = admin ? (await admin.rpc("ai_quota_status", { p_user: viewer.id })).data as { user_used: number; user_limit: number } | null : null;
  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-bold">AI <span className="gold-text">Creator Studio</span></h2>
        <p className="text-white/70">Turn verified news into posts, captions, scripts and banner prompts in seconds.</p>
      </div>
      <Studio providerReady={ready} providerLabel={PROVIDERS.find((p) => p.value === settings?.active_provider)?.label ?? "AI"}
        initial={initial} remaining={quota ? { used: quota.user_used, limit: quota.user_limit } : null} />
    </div>
  );
}
