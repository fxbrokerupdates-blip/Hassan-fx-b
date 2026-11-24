import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card } from "@/components/admin/ui";
import { Studio } from "@/components/studio/studio";
import { getAiSettings } from "@/lib/ai/service";
import { isProviderConfigured } from "@/lib/ai/providers";
import { GenerationItem, type GenRow } from "@/components/member/generation-item";
import { CONTENT_TYPES } from "@/lib/ai/catalog";
import { str, type RawParams } from "@/lib/params";

export const metadata = { title: "Admin AI Creator Studio" };
export const dynamic = "force-dynamic";

export default async function AdminStudio({ searchParams }: { searchParams: Promise<RawParams> }) {
  const viewer = await requirePermission("ai.use_admin");
  const sp = await searchParams;
  const settings = await getAiSettings();
  const ready = Boolean(settings?.enabled && (isProviderConfigured(settings.active_provider) || (settings.fallback_provider && isProviderConfigured(settings.fallback_provider))));
  const supabase = await createSupabaseServer();
  let initial: { kind: "broker" | "trading"; item: { id: string; title: string } } | undefined;
  const id = str(sp, "id", 40);
  if (str(sp, "source") === "article" && id && /^[0-9a-f-]{36}$/.test(id)) {
    const { data } = await supabase.from("news_articles").select("id,title,news_type").eq("id", id).maybeSingle();
    if (data) initial = { kind: data.news_type, item: { id: data.id, title: data.title } };
  }
  const { data: history } = await supabase.from("ai_generations").select("id,content_type,title,output,created_at,is_saved,source_type,provider,model")
    .eq("user_id", viewer.id).eq("is_admin", true).order("created_at", { ascending: false }).limit(15);
  return (
    <div className="space-y-6">
      <AdminHeader title="Admin AI" gold="Creator Studio" description="Generate articles, summaries, prompts, scripts, social posts, newsletters and SEO metadata from selected news. Everything stays a draft until you paste it into the CMS and publish." />
      <Studio adminStudio providerReady={ready} providerLabel={settings?.active_provider ?? "AI"} initial={initial} />
      <Card title="Your recent admin generations">
        <div className="space-y-3">{(history ?? []).map((g) => <GenerationItem key={g.id} g={g as GenRow} label={CONTENT_TYPES.find((c) => c.value === g.content_type)?.label ?? g.content_type} />)}
          {(history ?? []).length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}</div>
      </Card>
    </div>
  );
}
