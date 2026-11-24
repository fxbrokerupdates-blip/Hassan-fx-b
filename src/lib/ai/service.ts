import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { buildSystemPrompt, buildUserPrompt, type GenerationOptions, type SourceMaterial } from "@/lib/ai/prompt-builder";
import { callProvider, isProviderConfigured, ProviderError } from "@/lib/ai/providers";
import { CONTENT_TYPES, type ProviderId } from "@/lib/ai/catalog";
import { truncate } from "@/lib/utils";

export interface AiSettings {
  enabled: boolean; member_enabled: boolean; active_provider: ProviderId; model: string;
  fallback_provider: ProviderId | null; fallback_model: string | null; temperature: number; max_output_tokens: number;
  default_language: string; system_instructions: string; per_user_daily_limit: number; global_daily_limit: number;
  global_monthly_limit: number; timeout_ms: number; cost_input_per_million: number; cost_output_per_million: number;
}

export async function getAiSettings(): Promise<AiSettings | null> {
  const admin = createSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from("ai_provider_settings").select("*").eq("id", 1).maybeSingle();
  return (data as AiSettings) ?? null;
}

export class GenerationError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}

/** Resolves the selected source into plain text. Members may only use published content. */
export async function resolveSource(kind: SourceMaterial["kind"], id: string | undefined, text: string | undefined, staff: boolean): Promise<SourceMaterial> {
  const admin = createSupabaseAdmin();
  if (kind === "topic" || kind === "text") {
    const body = (text ?? "").trim();
    if (body.length < (kind === "topic" ? 3 : 20)) throw new GenerationError(kind === "topic" ? "Enter a topic." : "Paste at least 20 characters of text.", 400, "invalid_source");
    return { kind, body };
  }
  if (!admin || !id) throw new GenerationError("Select a source item.", 400, "invalid_source");
  if (kind === "article") {
    let q = admin.from("news_articles").select("title,summary,content,key_highlights,source_name,original_url,published_at,status").eq("id", id);
    if (!staff) q = q.eq("status", "published");
    const { data } = await q.maybeSingle();
    if (!data) throw new GenerationError("News article not found.", 404, "not_found");
    return { kind, title: data.title, body: [data.summary, (data.key_highlights ?? []).join("\n"), data.content].filter(Boolean).join("\n\n"),
      source_name: data.source_name, source_url: data.original_url, published_at: data.published_at };
  }
  if (kind === "banner_prompt") {
    const { data } = await admin.from("banner_prompts").select("title,prompt_text,status").eq("id", id).maybeSingle();
    if (!data || (!staff && data.status !== "published")) throw new GenerationError("Prompt not found.", 404, "not_found");
    return { kind, title: data.title, body: data.prompt_text };
  }
  const { data } = await admin.from("video_scripts").select("title,topic,hook,body,closing,status").eq("id", id).maybeSingle();
  if (!data || (!staff && data.status !== "published")) throw new GenerationError("Script not found.", 404, "not_found");
  return { kind: "video_script", title: data.title, body: [data.topic, data.hook, data.body, data.closing].filter(Boolean).join("\n\n") };
}

/**
 * Full generation pipeline: settings → limits → provider (with fallback) → usage log → stored generation.
 */
export async function generateContent(params: {
  userId: string; isAdminStudio: boolean; options: GenerationOptions; source: SourceMaterial; sourceId?: string;
}): Promise<{ id: string; output: string; provider: string; model: string }> {
  const admin = createSupabaseAdmin();
  const settings = await getAiSettings();
  if (!admin || !settings) throw new GenerationError("AI is not available: database not configured.", 503, "not_configured");
  if (!settings.enabled) throw new GenerationError("AI generation is currently turned off by the administrator.", 503, "disabled");
  if (!params.isAdminStudio && !settings.member_enabled) throw new GenerationError("The AI Creator Studio is temporarily unavailable.", 503, "disabled");
  if (!CONTENT_TYPES.some((c) => c.value === params.options.content_type)) throw new GenerationError("Unknown content type.", 400, "invalid");

  const primary = settings.active_provider;
  if (!isProviderConfigured(primary) && !(settings.fallback_provider && isProviderConfigured(settings.fallback_provider))) {
    await admin.from("ai_usage_logs").insert({ user_id: params.userId, feature: params.isAdminStudio ? "admin_studio" : "member_studio",
      provider: primary, model: settings.model, status: "not_configured", error_code: "missing_api_key" });
    throw new GenerationError("The AI provider has not been configured yet. An administrator must add an API key.", 503, "not_configured");
  }

  const { data: quota } = await admin.rpc("ai_quota_status", { p_user: params.userId });
  const q = quota as { allowed: boolean; user_used: number; user_limit: number; global_day: number; global_day_limit: number; global_month: number; global_month_limit: number } | null;
  if (q) {
    const globalBlocked = q.global_day >= q.global_day_limit || q.global_month >= q.global_month_limit;
    if (globalBlocked) throw new GenerationError("The platform's daily AI capacity has been reached. Please try again tomorrow.", 429, "global_limit");
    if (!params.isAdminStudio && q.user_used >= q.user_limit) {
      throw new GenerationError(`You have reached your daily limit of ${q.user_limit} AI generations. It resets at 00:00 UTC.`, 429, "user_limit");
    }
  }

  const { data: templates } = await admin.from("ai_templates").select("instructions,content_type")
    .eq("is_active", true).in("scope", params.isAdminStudio ? ["admin", "both"] : ["member", "both"]);
  const tpl = (templates ?? []).filter((t) => t.content_type === "any" || t.content_type === params.options.content_type).map((t) => t.instructions);
  const system = buildSystemPrompt(settings.system_instructions, tpl);
  const user = buildUserPrompt({ language: settings.default_language, ...params.options }, params.source);

  const attempts: [ProviderId, string][] = [[primary, settings.model]];
  if (settings.fallback_provider && settings.fallback_model) attempts.push([settings.fallback_provider, settings.fallback_model]);

  let lastErr: ProviderError | null = null;
  for (const [provider, model] of attempts) {
    if (!isProviderConfigured(provider)) continue;
    const started = Date.now();
    try {
      const res = await callProvider(provider, { system, user, model, temperature: Number(settings.temperature), maxTokens: settings.max_output_tokens, timeoutMs: settings.timeout_ms });
      const cost = ((res.inputTokens ?? 0) * Number(settings.cost_input_per_million) + (res.outputTokens ?? 0) * Number(settings.cost_output_per_million)) / 1_000_000;
      const label = CONTENT_TYPES.find((c) => c.value === params.options.content_type)?.label ?? params.options.content_type;
      const { data: gen, error } = await admin.from("ai_generations").insert({
        user_id: params.userId, content_type: params.options.content_type, source_type: params.source.kind, source_id: params.sourceId ?? null,
        title: truncate(`${label}: ${params.source.title ?? params.source.body}`, 140), options: params.options, output: res.text.trim(),
        status: "completed", provider, model, is_admin: params.isAdminStudio,
      }).select("id").single();
      if (error) throw new ProviderError("Could not store generation", "provider_error");
      await admin.from("ai_usage_logs").insert({ user_id: params.userId, generation_id: gen.id, feature: params.isAdminStudio ? "admin_studio" : "member_studio",
        provider, model, status: "success", input_tokens: res.inputTokens ?? null, output_tokens: res.outputTokens ?? null,
        est_cost_usd: cost || null, latency_ms: Date.now() - started });
      return { id: gen.id, output: res.text.trim(), provider, model };
    } catch (e) {
      lastErr = e instanceof ProviderError ? e : new ProviderError("Unexpected AI error", "provider_error");
      await admin.from("ai_usage_logs").insert({ user_id: params.userId, feature: params.isAdminStudio ? "admin_studio" : "member_studio",
        provider, model, status: lastErr.code === "timeout" ? "timeout" : lastErr.code === "rate_limited" ? "rate_limited" : "failed",
        error_code: lastErr.message.slice(0, 200), latency_ms: Date.now() - started });
    }
  }
  const msg = lastErr?.code === "timeout" ? "The AI provider took too long to respond. Please try again."
    : lastErr?.code === "rate_limited" ? "The AI provider is busy. Please try again in a minute."
    : "AI generation failed. Please try again.";
  throw new GenerationError(msg, 502, lastErr?.code ?? "failed");
}
