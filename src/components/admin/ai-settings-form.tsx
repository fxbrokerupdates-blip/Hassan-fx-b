"use client";
import { useActionState, useState } from "react";
import { saveAiSettingsAction, type AdminState } from "@/app/admin/actions";
import { PROVIDERS, AI_LANGUAGES } from "@/lib/ai/catalog";

export interface AiSettingsValues {
  enabled: boolean; member_enabled: boolean; active_provider: string; model: string; fallback_provider: string | null; fallback_model: string | null;
  temperature: number; max_output_tokens: number; default_language: string; system_instructions: string; per_user_daily_limit: number;
  global_daily_limit: number; global_monthly_limit: number; timeout_ms: number; cost_input_per_million: number; cost_output_per_million: number;
}

export function AiSettingsForm({ s, configured }: { s: AiSettingsValues; configured: Record<string, boolean> }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(saveAiSettingsAction, {});
  const [provider, setProvider] = useState(s.active_provider);
  const models = PROVIDERS.find((p) => p.value === provider)?.models ?? [];
  const num = (name: keyof AiSettingsValues, label: string, step = "1") => (
    <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} type="number" step={step} defaultValue={String(s[name] ?? "")} className="input" /></div>
  );
  return (
    <form action={action} className="space-y-5">
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={s.enabled} className="size-4 accent-[var(--primary-gold)]" />AI features enabled</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="member_enabled" defaultChecked={s.member_enabled} className="size-4 accent-[var(--primary-gold)]" />Member AI Creator Studio enabled</label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className="label" htmlFor="active_provider">Active provider</label>
          <select id="active_provider" name="active_provider" value={provider} onChange={(e) => setProvider(e.target.value)} className="input">
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}{configured[p.value] ? "" : " (not configured)"}</option>)}</select></div>
        <div><label className="label" htmlFor="model">Model</label><input id="model" name="model" defaultValue={s.model} list="model-list" required className="input" />
          <datalist id="model-list">{models.map((m) => <option key={m} value={m} />)}</datalist><p className="mt-1 text-xs text-muted">Type any model ID supported by the provider.</p></div>
        <div><label className="label" htmlFor="fallback_provider">Fallback provider</label>
          <select id="fallback_provider" name="fallback_provider" defaultValue={s.fallback_provider ?? ""} className="input"><option value="">None</option>
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}{configured[p.value] ? "" : " (not configured)"}</option>)}</select></div>
        <div><label className="label" htmlFor="fallback_model">Fallback model</label><input id="fallback_model" name="fallback_model" defaultValue={s.fallback_model ?? ""} className="input" /></div>
        {num("temperature", "Temperature (0–2)", "0.05")}
        {num("max_output_tokens", "Max output tokens")}
        <div><label className="label" htmlFor="default_language">Default language</label><select id="default_language" name="default_language" defaultValue={s.default_language} className="input">{AI_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
        {num("timeout_ms", "Timeout (ms)")}
        {num("per_user_daily_limit", "Per-member daily limit")}
        {num("global_daily_limit", "Global daily limit")}
        {num("global_monthly_limit", "Global monthly limit")}
        {num("cost_input_per_million", "Cost per 1M input tokens (USD)", "0.0001")}
        {num("cost_output_per_million", "Cost per 1M output tokens (USD)", "0.0001")}
      </div>
      <div><label className="label" htmlFor="system_instructions">Additional system instructions</label>
        <textarea id="system_instructions" name="system_instructions" defaultValue={s.system_instructions} maxLength={8000} className="input min-h-32" />
        <p className="mt-1 text-xs text-muted">Appended to the built-in safety rules (no fabricated facts, untrusted source handling, no investment advice). They cannot remove those rules.</p></div>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-gold h-10 px-5">{pending ? "Saving…" : "Save AI settings"}</button>
        {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
        {state.message && <p role="status" className="text-sm text-emerald-300">{state.message}</p>}
      </div>
    </form>
  );
}
