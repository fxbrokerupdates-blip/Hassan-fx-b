import "server-only";
import { serverEnv } from "@/lib/server-env";
import type { ProviderId } from "@/lib/ai/catalog";

export interface ProviderRequest { system: string; user: string; model: string; temperature: number; maxTokens: number; timeoutMs: number }
export interface ProviderResult { text: string; inputTokens?: number; outputTokens?: number }
export class ProviderError extends Error {
  constructor(message: string, public code: "not_configured" | "rate_limited" | "timeout" | "provider_error" | "empty") { super(message); }
}

export function providerKey(p: ProviderId): string {
  return { gemini: serverEnv.geminiKey, openai: serverEnv.openaiKey, anthropic: serverEnv.anthropicKey, openai_compatible: serverEnv.compatibleKey }[p];
}
export function isProviderConfigured(p: ProviderId): boolean {
  return Boolean(providerKey(p)) && (p !== "openai_compatible" || Boolean(serverEnv.compatibleBaseUrl));
}

async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new ProviderError("The AI provider timed out", "timeout");
    throw new ProviderError("Could not reach the AI provider", "provider_error");
  }
  if (res.status === 429) throw new ProviderError("The AI provider is rate limiting requests", "rate_limited");
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300).replace(/(key|token)=[^&\s"]+/gi, "$1=***");
    throw new ProviderError(`AI provider error ${res.status}: ${detail}`, "provider_error");
  }
  return res.json();
}

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function gemini(r: ProviderRequest): Promise<ProviderResult> {
  const j = (await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(r.model)}:generateContent`,
    { "x-goog-api-key": serverEnv.geminiKey },
    { systemInstruction: { parts: [{ text: r.system }] }, contents: [{ role: "user", parts: [{ text: r.user }] }],
      generationConfig: { temperature: r.temperature, maxOutputTokens: r.maxTokens } }, r.timeoutMs)) as Any;
  const text = (j.candidates?.[0]?.content?.parts ?? []).map((p: Any) => p.text ?? "").join("");
  return { text, inputTokens: j.usageMetadata?.promptTokenCount, outputTokens: j.usageMetadata?.candidatesTokenCount };
}

async function openaiLike(r: ProviderRequest, base: string, key: string): Promise<ProviderResult> {
  const j = (await post(`${base.replace(/\/$/, "")}/chat/completions`, { Authorization: `Bearer ${key}` },
    { model: r.model, temperature: r.temperature, max_tokens: r.maxTokens,
      messages: [{ role: "system", content: r.system }, { role: "user", content: r.user }] }, r.timeoutMs)) as Any;
  return { text: j.choices?.[0]?.message?.content ?? "", inputTokens: j.usage?.prompt_tokens, outputTokens: j.usage?.completion_tokens };
}

async function anthropic(r: ProviderRequest): Promise<ProviderResult> {
  const j = (await post("https://api.anthropic.com/v1/messages", { "x-api-key": serverEnv.anthropicKey, "anthropic-version": "2023-06-01" },
    { model: r.model, system: r.system, max_tokens: r.maxTokens, temperature: Math.min(r.temperature, 1),
      messages: [{ role: "user", content: r.user }] }, r.timeoutMs)) as Any;
  const text = (j.content ?? []).filter((b: Any) => b.type === "text").map((b: Any) => b.text).join("");
  return { text, inputTokens: j.usage?.input_tokens, outputTokens: j.usage?.output_tokens };
}

/** Calls one provider. API keys never leave the server. */
export async function callProvider(provider: ProviderId, req: ProviderRequest): Promise<ProviderResult> {
  if (!isProviderConfigured(provider)) throw new ProviderError("This AI provider has not been configured", "not_configured");
  let out: ProviderResult;
  switch (provider) {
    case "gemini": out = await gemini(req); break;
    case "openai": out = await openaiLike(req, "https://api.openai.com/v1", serverEnv.openaiKey); break;
    case "openai_compatible": out = await openaiLike(req, serverEnv.compatibleBaseUrl, serverEnv.compatibleKey); break;
    case "anthropic": out = await anthropic(req); break;
  }
  if (!out.text.trim()) throw new ProviderError("The AI provider returned an empty response", "empty");
  return out;
}
