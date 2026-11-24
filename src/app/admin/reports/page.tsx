import { requirePermission, can } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Reports & Export" };

const REPORTS = [
  ["users", "User list", "users.export", "Profile fields; email/phone only with PII permission"],
  ["daily", "Daily / weekly / monthly activity", "analytics.export", "Visitors, sessions, page views, DAU per day — aggregate weekly/monthly in Excel"],
  ["rankings", "User rankings", "analytics.export", "Leaderboard by engagement score"],
  ["content", "Content usage & news performance", "analytics.export", "Views, copies, saves, shares per item"],
  ["ai_usage", "AI usage", "analytics.export", "Provider, model, status, tokens, estimated cost"],
  ["traffic_sources", "Traffic sources", "analytics.export", "Sources and referrer hosts"],
  ["registrations", "Registrations", "analytics.export", "Sign-ups by date, country and profession"],
  ["retention", "Retention cohorts", "analytics.export", "Weekly and monthly cohorts"],
  ["brokers", "Broker popularity", "analytics.export", "Followers per broker"],
] as const;

export default async function ReportsPage() {
  const viewer = await requirePermission("analytics.export");
  const supabase = await createSupabaseServer();
  const { data: log } = await supabase.from("analytics_reports").select("id,report_type,row_count,contains_pii,created_at,params").order("created_at", { ascending: false }).limit(20);
  const d = new Date();
  const to = d.toISOString().slice(0, 10), from = new Date(d.getTime() - 29 * 86400_000).toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      <AdminHeader title="Reports &" gold="Export" description="CSV exports open directly in Excel (UTF-8). Cells are protected against spreadsheet formula injection, and every export is logged." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.filter(([, , p]) => can(viewer, p)).map(([key, label, , desc]) => (
          <Card key={key} title={label}>
            <p className="mb-3 text-sm text-muted">{desc}</p>
            <form action="/api/admin/export" method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="report" value={key} />
              {key === "content" && <select name="type" className="input h-9 w-36" aria-label="Content type"><option value="article">News</option><option value="banner_prompt">Prompts</option><option value="video_script">Scripts</option><option value="broker">Brokers</option></select>}
              <input type="date" name="from" defaultValue={from} className="input h-9 w-36" aria-label="From" />
              <input type="date" name="to" defaultValue={to} className="input h-9 w-36" aria-label="To" />
              <button className="btn-gold h-9 px-3 text-sm">Download CSV</button>
            </form>
          </Card>
        ))}
      </div>
      <Card title="Recent exports">
        <table className="table-clean"><thead><tr><th>Report</th><th>Rows</th><th>PII</th><th>Range</th><th>When</th></tr></thead>
          <tbody>{(log ?? []).map((l) => (
            <tr key={l.id}><td>{l.report_type}</td><td>{l.row_count}</td><td>{l.contains_pii ? "Yes" : "No"}</td>
              <td className="text-muted">{(l.params as { from?: string; to?: string }).from} → {(l.params as { to?: string }).to}</td><td className="text-muted">{formatDate(l.created_at, "UTC", true)}</td></tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}
