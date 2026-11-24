import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAiSettings } from "@/lib/ai/service";
import { callProvider, isProviderConfigured } from "@/lib/ai/providers";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt-builder";
import { truncate } from "@/lib/utils";

interface AutomationSettings {
  enabled: boolean; publish_time_utc: string; prompts_count: number; scripts_count: number; languages: string[];
  categories: string[]; durations: number[]; auto_generate_drafts: boolean; require_approval: boolean; auto_publish: boolean;
}
const RATIOS = ["1:1", "4:5", "9:16", "16:9"] as const;

/** Splits "HOOK: … MAIN SCRIPT: … CLOSING: … CTA: …" output into fields. */
export function parseScriptSections(text: string) {
  const grab = (label: string) => {
    const m = text.match(new RegExp(`${label}\\s*[:\\-]\\s*([\\s\\S]*?)(?=\\n\\s*(HOOK|MAIN SCRIPT|SCRIPT|CLOSING|CTA)\\s*[:\\-]|$)`, "i"));
    return m?.[1]?.trim() || null;
  };
  const hook = grab("HOOK");
  const body = grab("MAIN SCRIPT") ?? grab("SCRIPT");
  return { hook: hook ?? text.split("\n")[0].slice(0, 300), body: body ?? text, closing: grab("CLOSING"), cta: grab("CTA") };
}

/**
 * Drafts the day's banner prompts and video scripts from trending published news.
 * Output is saved as drafts (or published only when admin enabled auto-publish without approval).
 */
export async function runDailyAutomation(force = false): Promise<Record<string, unknown>> {
  const db = createSupabaseAdmin();
  if (!db) throw new Error("Service role not configured");
  const { data: s } = await db.from("website_settings").select("value").eq("key", "automation.daily").maybeSingle();
  const cfg = (s?.value ?? {}) as AutomationSettings;
  if (!cfg.enabled && !force) return { skipped: "automation disabled" };
  const [hh, mm] = (cfg.publish_time_utc ?? "06:00").split(":").map(Number);
  const now = new Date();
  if (!force && (now.getUTCHours() * 60 + now.getUTCMinutes()) < hh * 60 + (mm || 0)) return { skipped: "before publish time" };
  const today = now.toISOString().slice(0, 10);
  if (!force) {
    const { count } = await db.from("banner_prompts").select("id", { count: "exact", head: true }).contains("tags", ["auto"]).eq("publish_date", today);
    if ((count ?? 0) > 0) return { skipped: "already generated today" };
  }
  if (!cfg.auto_generate_drafts) return { skipped: "draft generation disabled" };
  const ai = await getAiSettings();
  if (!ai?.enabled || !isProviderConfigured(ai.active_provider)) throw new Error("AI provider not configured or disabled");

  const { data: news } = await db.from("news_articles").select("id,title,summary,content,source_name,original_url,published_at,news_type,market,priority")
    .eq("status", "published").gte("published_at", new Date(Date.now() - 36 * 3600_000).toISOString())
    .order("priority", { ascending: true }).order("view_count", { ascending: false }).limit(20);
  const items = news ?? [];
  if (!items.length) return { skipped: "no recent published news" };
  const system = buildSystemPrompt(ai.system_instructions, []);
  const status = cfg.auto_publish && !cfg.require_approval ? "published" : "draft";
  const langs = cfg.languages?.length ? cfg.languages : ["en"];
  let prompts = 0, scripts = 0;
  const call = async (contentType: string, a: (typeof items)[number], extra: Record<string, unknown>) => {
    const started = Date.now();
    const user = buildUserPrompt({ content_type: contentType, tone: "Professional", include_cta: true, include_hashtags: false, ...extra },
      { kind: "article", title: a.title, body: [a.summary, a.content].filter(Boolean).join("\n\n"), source_name: a.source_name, source_url: a.original_url, published_at: a.published_at });
    try {
      const r = await callProvider(ai.active_provider, { system, user, model: ai.model, temperature: Number(ai.temperature), maxTokens: ai.max_output_tokens, timeoutMs: ai.timeout_ms });
      await db.from("ai_usage_logs").insert({ feature: "automation", provider: ai.active_provider, model: ai.model, status: "success", input_tokens: r.inputTokens ?? null, output_tokens: r.outputTokens ?? null, latency_ms: Date.now() - started });
      return r.text.trim();
    } catch (e) {
      await db.from("ai_usage_logs").insert({ feature: "automation", provider: ai.active_provider, model: ai.model, status: "failed", error_code: String(e).slice(0, 200), latency_ms: Date.now() - started });
      return null;
    }
  };
  for (let i = 0; i < Math.min(cfg.prompts_count ?? 3, 10); i++) {
    const a = items[i % items.length];
    const ratio = RATIOS[i % RATIOS.length];
    const lang = langs[i % langs.length];
    const text = await call("banner_prompt", a, { aspect_ratio: ratio, language: lang });
    if (!text) continue;
    const category = a.news_type === "broker" ? "broker_news" : a.market === "gold" ? "gold" : a.market === "forex" ? "forex" : a.market === "crypto" ? "crypto" : "trading_news";
    await db.from("banner_prompts").insert({ title: truncate(`Banner: ${a.title}`, 200), prompt_text: text.slice(0, 8000), category, aspect_ratio: ratio, language: lang,
      related_article_id: a.id, publish_date: today, status, published_at: status === "published" ? now.toISOString() : null, tags: ["auto"] });
    prompts++;
  }
  const durations = cfg.durations?.length ? cfg.durations : [40];
  for (let i = 0; i < Math.min(cfg.scripts_count ?? 2, 10); i++) {
    const a = items[(i + 1) % items.length];
    const d = durations[i % durations.length];
    const lang = langs[i % langs.length];
    const text = await call(d >= 90 ? "long_video_script" : "short_video_script", a, { duration_seconds: d, language: lang });
    if (!text) continue;
    const sec = parseScriptSections(text);
    await db.from("video_scripts").insert({ title: truncate(a.title, 200), topic: a.news_type === "broker" ? "Broker news" : "Market update",
      hook: sec.hook.slice(0, 2000), body: sec.body.slice(0, 8000), closing: sec.closing, cta: sec.cta, duration_seconds: [15, 30, 40, 60, 90, 120].includes(d) ? d : 40,
      language: lang, related_article_id: a.id, publish_date: today, status, published_at: status === "published" ? now.toISOString() : null });
    scripts++;
  }
  return { prompts, scripts, status };
}
