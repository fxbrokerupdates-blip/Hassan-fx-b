import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card } from "@/components/admin/ui";
import { JsonForm } from "@/components/admin/json-form";
import { RunJobButton } from "@/components/admin/run-buttons";
import { saveSettingAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Daily Automation" };

export default async function AutomationPage() {
  await requirePermission("automation.manage");
  const supabase = await createSupabaseServer();
  const [{ data: s }, { data: job }, { data: logs }] = await Promise.all([
    supabase.from("website_settings").select("value").eq("key", "automation.daily").maybeSingle(),
    supabase.from("scheduled_jobs").select("*").eq("key", "daily_content").maybeSingle(),
    supabase.from("job_execution_logs").select("*").eq("job_key", "daily_content").order("started_at", { ascending: false }).limit(10),
  ]);
  return (
    <div className="max-w-5xl space-y-6">
      <AdminHeader title="Daily Content" gold="Automation" description="Drafts daily banner prompts and video scripts from trending published news using the configured AI provider. With approval required (recommended), drafts wait in Banner Prompts / Video Scripts for an editor." />
      <Card title="Workflow settings">
        <JsonForm initial={(s?.value ?? {}) as never} action={saveSettingAction.bind(null, "automation.daily")} />
        <p className="mt-3 text-xs text-muted">Durations: 15, 30, 40, 60, 90, 120. Languages: en, ur, roman_ur, hi, ar. Publish time is UTC.</p>
      </Card>
      <Card title="Run" actions={<RunJobButton jobKey="daily_content" label="Generate drafts now" />}>
        <p className="text-sm text-muted">Last run: {job?.last_run_at ? formatDate(job.last_run_at, "UTC", true) : "never"} · status {job?.last_status ?? "—"} {job?.last_error && <span className="text-red-300">({job.last_error})</span>}</p>
        <ul className="mt-3 space-y-1 text-xs">{(logs ?? []).map((l) => <li key={l.id} className="rounded bg-white/5 p-2">{formatDate(l.started_at, "UTC", true)} · <strong>{l.status}</strong> · {JSON.stringify(l.details)}</li>)}</ul>
      </Card>
    </div>
  );
}
