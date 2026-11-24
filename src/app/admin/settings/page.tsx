import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card, Tabs } from "@/components/admin/ui";
import { JsonForm } from "@/components/admin/json-form";
import { saveSettingAction } from "@/app/admin/actions";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { oneOf, type RawParams } from "@/lib/params";

export const metadata = { title: "Global Settings" };

const TABS = {
  general: { label: "General & Brand", keys: [["site.general", "Website"], ["site.theme", "Theme colours"]] },
  registration: { label: "Registration & Access", keys: [["site.registration", "Registration"], ["content.access", "Guest access"], ["site.maintenance", "Maintenance mode"]] },
  content: { label: "Footer & Legal", keys: [["site.footer", "Footer"], ["site.legal", "Legal & static pages"]] },
  seo: { label: "SEO", keys: [["site.seo", "SEO defaults"]] },
  analytics: { label: "Analytics & Privacy", keys: [["analytics.tracking", "Tracking & retention"], ["analytics.engagement_weights", "Engagement score weights & daily caps"]] },
  news: { label: "News Pipeline", keys: [["news.pipeline", "Collection & classification"]] },
  integrations: { label: "Providers & Storage", keys: [["notifications.config", "Notification providers"], ["storage.uploads", "Uploads"]] },
} as const;
const EXTRA_DEFAULTS: Record<string, unknown> = {
  "analytics.engagement_weights": { active_day: 5, engaged_minute: 1, engaged_minutes_cap: 60, article_read: 2, articles_cap: 25, prompt_copy: 5, prompt_copies_cap: 10, script_copy: 5, script_copies_cap: 10, ai_generation: 8, ai_generations_cap: 10, content_saved: 3, saves_cap: 10, min_active_seconds: 60 },
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requirePermission("settings.manage");
  const tab = oneOf(await searchParams, "tab", Object.keys(TABS) as (keyof typeof TABS)[]) ?? "general";
  const supabase = await createSupabaseServer();
  const keys = TABS[tab].keys.map(([k]) => k);
  const { data } = await supabase.from("website_settings").select("key,value,updated_at").in("key", keys);
  const val = (k: string) => data?.find((d) => d.key === k)?.value ?? (DEFAULT_SETTINGS as Record<string, unknown>)[k] ?? EXTRA_DEFAULTS[k] ?? {};
  return (
    <div className="max-w-5xl">
      <AdminHeader title="Global" gold="Settings" description="Changes apply immediately across the website. API keys and secrets are never stored here — they live in server environment variables." />
      <Tabs current={tab} tabs={Object.entries(TABS).map(([k, t]) => ({ key: k, label: t.label, href: `/admin/settings?tab=${k}` }))} />
      <div className="space-y-6">
        {TABS[tab].keys.map(([k, label]) => (
          <Card key={k} title={label}>
            {k === "analytics.engagement_weights" && <p className="mb-3 text-xs text-muted">Points per meaningful action and the daily cap for each. Deduplication: copies count unique items per day; engaged minutes only from visible, active tabs.</p>}
            {k === "analytics.tracking" && <p className="mb-3 text-xs text-muted">Heartbeat 15–120s; idle after inactivity; offline after missed heartbeats. Raw events older than the retention period are deleted nightly.</p>}
            <JsonForm initial={val(k) as never} action={saveSettingAction.bind(null, k)} />
          </Card>
        ))}
      </div>
    </div>
  );
}
