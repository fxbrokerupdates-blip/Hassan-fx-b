import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card, KPI, StatusBadge } from "@/components/admin/ui";
import { AiSettingsForm, type AiSettingsValues } from "@/components/admin/ai-settings-form";
import { PROVIDERS } from "@/lib/ai/catalog";
import { isProviderConfigured, providerKey } from "@/lib/ai/providers";
import { maskSecret } from "@/lib/server-env";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata = { title: "AI Settings" };
export const dynamic = "force-dynamic";

export default async function AiSettingsPage() {
  await requirePermission("ai.settings");
  const supabase = await createSupabaseServer();
  const t0 = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").toISOString();
  const m0 = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const [{ data: s }, today, month, { data: failed }] = await Promise.all([
    supabase.from("ai_provider_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("ai_usage_logs").select("status,est_cost_usd,input_tokens,output_tokens").gte("created_at", t0).limit(50000),
    supabase.from("ai_usage_logs").select("status,est_cost_usd").gte("created_at", m0).limit(100000),
    supabase.from("ai_usage_logs").select("id,created_at,provider,model,status,error_code,feature").neq("status", "success").order("created_at", { ascending: false }).limit(25),
  ]);
  const configured = Object.fromEntries(PROVIDERS.map((p) => [p.value, isProviderConfigured(p.value)]));
  const T = today.data ?? [], M = month.data ?? [];
  const cost = (rows: { est_cost_usd: number | null }[]) => rows.reduce((a, r) => a + Number(r.est_cost_usd ?? 0), 0);
  return (
    <div className="max-w-6xl space-y-6">
      <AdminHeader title="AI" gold="Settings" description="Choose provider and model without code changes. API keys stay in server environment variables and are never sent to the browser."
        actions={<Link href="/admin/r/templates" className="btn-outline h-10 px-4 text-sm">Brand templates</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KPI label="Requests today" value={formatNumber(T.length)} sub={`${T.filter((r) => r.status !== "success").length} failed`} />
        <KPI label="Successful today" value={formatNumber(T.filter((r) => r.status === "success").length)} sub={`limit ${formatNumber(s?.global_daily_limit)}`} />
        <KPI label="Tokens today" value={formatNumber(T.reduce((a, r) => a + Number(r.input_tokens ?? 0) + Number(r.output_tokens ?? 0), 0))} />
        <KPI label="Est. cost today" value={`$${cost(T).toFixed(4)}`} sub="Based on configured prices" />
        <KPI label="Est. cost this month" value={`$${cost(M).toFixed(2)}`} sub={`${formatNumber(M.filter((r) => r.status === "success").length)} / ${formatNumber(s?.global_monthly_limit)} requests`} />
      </div>
      <Card title="Provider credentials (server environment)">
        <table className="table-clean"><thead><tr><th>Provider</th><th>Environment variable</th><th>Status</th><th>Key</th></tr></thead>
          <tbody>{PROVIDERS.map((p) => (
            <tr key={p.value}><td>{p.label}</td><td className="font-mono text-xs">{p.env}{p.value === "openai_compatible" ? " + OPENAI_COMPATIBLE_BASE_URL" : ""}</td>
              <td>{configured[p.value] ? <StatusBadge value="active" /> : <span className="text-xs text-amber-300">Not Configured</span>}</td>
              <td className="font-mono text-xs">{configured[p.value] ? maskSecret(providerKey(p.value)) : "—"}</td></tr>
          ))}</tbody></table>
        <p className="mt-2 text-xs text-muted">“Active” means a key is present. A real connectivity check happens on the next generation (see failed requests below).</p>
      </Card>
      <Card title="Configuration">{s ? <AiSettingsForm s={s as AiSettingsValues} configured={configured} /> : <p className="text-muted">Run migrations first.</p>}</Card>
      <Card title="Failed request log">
        <table className="table-clean"><thead><tr><th>When</th><th>Feature</th><th>Provider / model</th><th>Status</th><th>Error</th></tr></thead>
          <tbody>{(failed ?? []).map((f) => (
            <tr key={f.id}><td className="whitespace-nowrap text-muted">{formatDate(f.created_at, "UTC", true)}</td><td>{f.feature}</td><td>{f.provider} · {f.model}</td><td><StatusBadge value={f.status === "not_configured" ? "pending" : "failed"} /> <span className="text-xs">{f.status}</span></td><td className="max-w-96 text-xs text-red-200">{f.error_code}</td></tr>
          ))}{(failed ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">No failed requests.</td></tr>}</tbody></table>
      </Card>
    </div>
  );
}
