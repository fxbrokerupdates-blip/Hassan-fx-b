import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card, StatusBadge } from "@/components/admin/ui";
import { RunJobButton } from "@/components/admin/run-buttons";
import { JobControls } from "@/components/admin/job-row";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata = { title: "Jobs & News Refresh" };
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  await requirePermission("jobs.manage");
  const supabase = await createSupabaseServer();
  const [{ data: jobs }, { data: logs }, { data: sources }] = await Promise.all([
    supabase.from("scheduled_jobs").select("*").order("key"),
    supabase.from("job_execution_logs").select("*").order("started_at", { ascending: false }).limit(40),
    supabase.from("news_sources").select("id,name,enabled,next_run_at,last_success_at,consecutive_failures,last_error,refresh_minutes").order("next_run_at").limit(50),
  ]);
  return (
    <div className="space-y-6">
      <AdminHeader title="Background Jobs &" gold="News Refresh" description="Jobs run from a server-side scheduler calling /api/cron/run with the CRON_SECRET — never from a browser tab. Each job holds a database lock so runs never overlap."
        actions={<RunJobButton jobKey="news_refresh" label="Refresh all due sources" />} />
      <Card title="Scheduled jobs">
        <div className="overflow-x-auto"><table className="table-clean"><thead><tr><th>Job</th><th>Schedule</th><th>Last run</th><th>Status</th><th>Next run</th><th>Lock</th><th /></tr></thead>
          <tbody>{(jobs ?? []).map((j) => (
            <tr key={j.key}>
              <td><span className="font-medium">{j.name}</span><span className="block text-xs text-muted">{j.description}</span></td>
              <td><JobControls jobKey={j.key} enabled={j.enabled} interval={j.interval_minutes} /></td>
              <td className="whitespace-nowrap text-muted">{j.last_run_at ? timeAgo(j.last_run_at) : "never"}</td>
              <td><StatusBadge value={j.last_status} />{j.last_error && <span className="block max-w-60 truncate text-xs text-red-300" title={j.last_error}>{j.last_error}</span>}</td>
              <td className="whitespace-nowrap text-muted">{formatDate(j.next_run_at, "UTC", true)}</td>
              <td className="text-xs">{j.locked_until && new Date(j.locked_until) > new Date() ? "running" : "—"}</td>
              <td><RunJobButton jobKey={j.key} /></td>
            </tr>
          ))}</tbody></table></div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Source refresh queue" actions={<Link href="/admin/r/sources" className="text-sm text-gold-400">Manage sources →</Link>}>
          <table className="table-clean"><thead><tr><th>Source</th><th>Every</th><th>Next</th><th>Health</th></tr></thead>
            <tbody>{(sources ?? []).map((s) => (
              <tr key={s.id}><td><Link href={`/admin/r/sources/${s.id}`} className="hover:text-gold-400">{s.name}</Link>{!s.enabled && <span className="ml-2 text-xs text-muted">(disabled)</span>}</td>
                <td>{s.refresh_minutes}m</td><td className="whitespace-nowrap text-muted">{formatDate(s.next_run_at, "UTC", true)}</td>
                <td>{s.consecutive_failures ? <span className="text-xs text-red-300" title={s.last_error ?? ""}>{s.consecutive_failures} failures (backing off)</span> : s.last_success_at ? <span className="text-xs text-emerald-300">OK {timeAgo(s.last_success_at)}</span> : <span className="text-xs text-muted">never run</span>}</td></tr>
            ))}{(sources ?? []).length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted">No sources configured.</td></tr>}</tbody></table>
        </Card>
        <Card title="Execution log (failed jobs dashboard)">
          <ul className="max-h-[480px] space-y-1 overflow-y-auto text-xs scrollbar-thin">{(logs ?? []).map((l) => (
            <li key={l.id} className={`rounded p-2 ${l.status === "failed" ? "bg-red-500/10" : "bg-white/5"}`}>{formatDate(l.started_at, "UTC", true)} · <strong>{l.job_key}</strong> · {l.trigger} · <StatusBadge value={l.status} /> <span className="text-muted">{JSON.stringify(l.details).slice(0, 160)}</span></li>
          ))}</ul>
        </Card>
      </div>
    </div>
  );
}
