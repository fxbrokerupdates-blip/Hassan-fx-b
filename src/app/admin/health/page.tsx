import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { AdminHeader, Card } from "@/components/admin/ui";
import { isProviderConfigured } from "@/lib/ai/providers";
import { emailConfigured } from "@/lib/email";
import { serverEnv } from "@/lib/server-env";
import { formatDate, timeAgo, cn } from "@/lib/utils";

export const metadata = { title: "System Health" };
export const dynamic = "force-dynamic";

type Status = "Connected" | "Not Configured" | "Healthy" | "Degraded" | "Failed";
const TONE: Record<Status, string> = { Connected: "text-emerald-300", Healthy: "text-emerald-300", "Not Configured": "text-white/60", Degraded: "text-amber-300", Failed: "text-red-300" };

export default async function HealthPage() {
  await requirePermission("health.view");
  const supabase = await createSupabaseServer();
  const started = Date.now();
  const ping = await supabase.from("feature_flags").select("key", { head: true, count: "exact" });
  const dbLatency = Date.now() - started;
  const admin = createSupabaseAdmin();
  const [{ data: jobs }, { data: sources }, { data: errors }, { data: ai }, storage] = await Promise.all([
    supabase.from("scheduled_jobs").select("key,name,enabled,last_status,last_run_at,next_run_at,interval_minutes"),
    supabase.from("news_sources").select("enabled,consecutive_failures,last_success_at"),
    supabase.from("system_error_logs").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("ai_usage_logs").select("status,created_at,provider").order("created_at", { ascending: false }).limit(20),
    admin ? admin.storage.listBuckets() : Promise.resolve({ data: null, error: { message: "no service role" } }),
  ]);
  const settings = await supabase.from("ai_provider_settings").select("active_provider,enabled").eq("id", 1).maybeSingle();
  const lastAi = (ai ?? [])[0];
  const aiStatus: Status = !settings.data?.enabled || !isProviderConfigured(settings.data.active_provider) ? "Not Configured"
    : !lastAi ? "Connected" : lastAi.status === "success" ? "Healthy" : (ai ?? []).slice(0, 5).every((x) => x.status !== "success") ? "Failed" : "Degraded";
  const enabled = (sources ?? []).filter((s) => s.enabled);
  const failing = enabled.filter((s) => s.consecutive_failures > 0).length;
  const collector: Status = enabled.length === 0 ? "Not Configured" : failing === 0 ? "Healthy" : failing === enabled.length ? "Failed" : "Degraded";
  const overdue = (jobs ?? []).filter((j) => j.enabled && new Date(j.next_run_at).getTime() < Date.now() - 2 * j.interval_minutes * 60_000);
  const failedJobs = (jobs ?? []).filter((j) => j.last_status === "failed");
  const jobStatus: Status = (jobs ?? []).every((j) => !j.last_run_at) ? "Not Configured" : failedJobs.length ? "Degraded" : overdue.length ? "Degraded" : "Healthy";
  const checks: { name: string; status: Status; detail: string }[] = [
    { name: "Application", status: "Healthy", detail: `Server rendered at ${new Date().toISOString()}` },
    { name: "Database connectivity", status: ping.error ? "Failed" : dbLatency > 1500 ? "Degraded" : "Healthy", detail: ping.error ? ping.error.message : `Query round-trip ${dbLatency} ms` },
    { name: "Service role (server)", status: admin ? "Connected" : "Not Configured", detail: admin ? "Key present (never exposed to browsers)" : "SUPABASE_SERVICE_ROLE_KEY missing — tracking, jobs and exports disabled" },
    { name: "Storage", status: storage.error ? (admin ? "Failed" : "Not Configured") : "Healthy", detail: storage.error ? storage.error.message : `${storage.data?.length ?? 0} buckets` },
    { name: "News collector", status: collector, detail: `${enabled.length} enabled sources, ${failing} failing` },
    { name: "Background jobs", status: jobStatus, detail: `${failedJobs.length} failed, ${overdue.length} overdue — scheduler must call /api/cron/run` },
    { name: "Scheduler secret", status: serverEnv.cronSecret.length >= 16 ? "Connected" : "Not Configured", detail: "CRON_SECRET (≥16 chars) required for scheduled jobs" },
    { name: "AI integration", status: aiStatus, detail: lastAi ? `Last request ${timeAgo(lastAi.created_at)}: ${lastAi.status}` : "No requests yet" },
    { name: "Email provider", status: emailConfigured() ? "Connected" : "Not Configured", detail: "Resend (EMAIL_PROVIDER=resend). Not verified until a send succeeds." },
    { name: "Web push (OneSignal)", status: serverEnv.oneSignalKey ? "Connected" : "Not Configured", detail: "Architecture prepared; delivery requires configuration" },
  ];
  return (
    <div className="space-y-6">
      <AdminHeader title="System" gold="Health" description="Statuses are derived from real checks and recent results. “Connected” means credentials exist but no successful call has proven it yet." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((c) => (
          <div key={c.name} className="card-plain p-4">
            <div className="flex items-center justify-between"><p className="font-semibold">{c.name}</p><span className={cn("text-sm font-bold", TONE[c.status])}>{c.status}</span></div>
            <p className="mt-1 text-xs text-muted">{c.detail}</p>
          </div>
        ))}
      </div>
      <Card title="Recent application errors">
        <table className="table-clean"><thead><tr><th>When</th><th>Level</th><th>Source</th><th>Message</th></tr></thead>
          <tbody>{(errors ?? []).map((e) => <tr key={e.id}><td className="whitespace-nowrap text-muted">{formatDate(e.created_at, "UTC", true)}</td><td>{e.level}</td><td className="font-mono text-xs">{e.source}</td><td className="text-xs">{e.message}</td></tr>)}
            {(errors ?? []).length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted">No errors logged.</td></tr>}</tbody></table>
      </Card>
    </div>
  );
}
