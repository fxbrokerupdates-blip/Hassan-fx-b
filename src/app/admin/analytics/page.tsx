import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card, KPI, Tabs, EstimateNote } from "@/components/admin/ui";
import { BarsChart, Funnel, Heatmap, TimeChart } from "@/components/admin/charts";
import { RangePicker } from "@/components/admin/range-picker";
import { resolveRange } from "@/lib/admin/range";
import { oneOf, type RawParams } from "@/lib/params";
import { formatDuration, formatNumber } from "@/lib/utils";

export const metadata = { title: "Website Analytics" };
export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—");

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requirePermission("analytics.view");
  const sp = await searchParams;
  const tab = oneOf(sp, "tab", ["traffic", "funnels", "retention"] as const) ?? "traffic";
  const r = resolveRange(sp);
  const from = `${r.from}T00:00:00Z`, to = new Date(new Date(`${r.to}T00:00:00Z`).getTime() + 86400_000).toISOString();
  const supabase = await createSupabaseServer();
  const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400_000);
  const bucket = days <= 2 ? "hour" : days <= 92 ? "day" : days <= 400 ? "week" : "month";
  const tabs = ["traffic", "funnels", "retention"].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), href: `/admin/analytics?tab=${k}&range=${r.key}&from=${r.from}&to=${r.to}` }));

  let body: React.ReactNode = null;
  if (tab === "traffic") {
    const [ts, summary, src, dev, br, ctry, land, exit, pages, heat, feat, regs] = await Promise.all([
      supabase.rpc("analytics_timeseries", { p_from: from, p_to: to, p_bucket: bucket }),
      supabase.from("daily_analytics_summary").select("*").gte("day", r.from).lte("day", r.to),
      supabase.rpc("analytics_breakdown", { p_from: from, p_to: to, p_dimension: "traffic_source" }),
      supabase.rpc("analytics_breakdown", { p_from: from, p_to: to, p_dimension: "device_category" }),
      supabase.rpc("analytics_breakdown", { p_from: from, p_to: to, p_dimension: "browser", p_limit: 8 }),
      supabase.rpc("analytics_breakdown", { p_from: from, p_to: to, p_dimension: "country", p_limit: 12 }),
      supabase.rpc("analytics_breakdown", { p_from: from, p_to: to, p_dimension: "landing_path", p_limit: 10 }),
      supabase.rpc("analytics_breakdown", { p_from: from, p_to: to, p_dimension: "exit_path", p_limit: 10 }),
      supabase.rpc("analytics_top_pages", { p_from: from, p_to: to, p_limit: 15 }),
      supabase.rpc("analytics_heatmap", { p_from: from, p_to: to }),
      supabase.rpc("analytics_feature_popularity", { p_from: from, p_to: to }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to),
    ]);
    const S = (summary.data ?? []) as Record<string, number>[];
    const sum = (k: string) => S.reduce((a, x) => a + Number(x[k] ?? 0), 0);
    const sessions = sum("sessions"), bounces = sum("bounces"), engagedSessions = sum("engaged_sessions");
    const tsData = ((ts.data ?? []) as Record<string, string | number>[]).map((x) => ({
      t: bucket === "hour" ? String(x.bucket).slice(5, 16).replace("T", " ") : String(x.bucket).slice(0, 10), Visitors: Number(x.visitors), "Page views": Number(x.page_views), Sessions: Number(x.sessions),
    }));
    const toBars = (d: unknown) => ((d ?? []) as { label: string; sessions: number }[]).map((x) => ({ label: x.label, Sessions: Number(x.sessions) }));
    const tbl = (d: unknown, h: string) => (
      <table className="table-clean"><thead><tr><th>{h}</th><th>Sessions</th><th>Visitors</th></tr></thead>
        <tbody>{((d ?? []) as { label: string; sessions: number; visitors: number }[]).map((x) => <tr key={x.label}><td className="max-w-60 truncate">{x.label}</td><td>{formatNumber(x.sessions)}</td><td>{formatNumber(x.visitors)}</td></tr>)}</tbody></table>
    );
    body = (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <KPI label="Unique visitors*" value={formatNumber(sum("unique_visitors"))} sub={`${formatNumber(sum("guest_visitors"))} guests · ${formatNumber(sum("registered_visitors"))} members`} />
          <KPI label="New vs returning*" value={`${formatNumber(sum("new_visitors"))} / ${formatNumber(sum("returning_visitors"))}`} />
          <KPI label="Sessions" value={formatNumber(sessions)} sub={`${formatNumber(sum("page_views"))} page views`} />
          <KPI label="Avg engaged / session" value={formatDuration(sessions ? sum("engaged_seconds") / sessions : 0)} sub="Estimate" />
          <KPI label="Bounce rate" value={pct(bounces, sessions)} sub={`Engagement rate ${pct(engagedSessions, sessions)}`} />
          <KPI label="Registration conversion" value={pct(regs.count ?? 0, sum("guest_visitors"))} sub={`${formatNumber(regs.count ?? 0)} sign-ups`} />
        </div>
        <Card title={`Traffic by ${bucket}`}><TimeChart data={tsData} xKey="t" series={[{ key: "Visitors", label: "Visitors" }, { key: "Sessions", label: "Sessions" }]} /></Card>
        <div className="grid gap-6 xl:grid-cols-3">
          <Card title="Traffic sources"><BarsChart data={toBars(src.data)} xKey="label" series={[{ key: "Sessions", label: "Sessions" }]} layout="vertical" height={220} /></Card>
          <Card title="Devices"><BarsChart data={toBars(dev.data)} xKey="label" series={[{ key: "Sessions", label: "Sessions" }]} layout="vertical" height={220} /></Card>
          <Card title="Browsers"><BarsChart data={toBars(br.data)} xKey="label" series={[{ key: "Sessions", label: "Sessions" }]} layout="vertical" height={220} /></Card>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Activity heatmap (sessions, UTC)"><Heatmap cells={(heat.data ?? []) as { dow: number; hour: number; sessions: number }[]} /></Card>
          <Card title="Feature popularity"><BarsChart data={((feat.data ?? []) as { feature: string; events: number }[]).map((f) => ({ label: f.feature.replace(/_/g, " "), Events: Number(f.events) }))} xKey="label" series={[{ key: "Events", label: "Events" }]} layout="vertical" height={260} /></Card>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Most visited pages"><table className="table-clean"><thead><tr><th>Page</th><th>Views</th><th>Visitors</th></tr></thead>
            <tbody>{((pages.data ?? []) as { path: string; views: number; visitors: number }[]).map((p) => <tr key={p.path}><td className="max-w-72 truncate">{p.path}</td><td>{formatNumber(p.views)}</td><td>{formatNumber(p.visitors)}</td></tr>)}</tbody></table></Card>
          <Card title="Countries">{tbl(ctry.data, "Country")}</Card>
          <Card title="Top landing pages">{tbl(land.data, "Landing page")}</Card>
          <Card title="Top exit pages">{tbl(exit.data, "Exit page")}</Card>
        </div>
        <div className="text-xs text-muted space-y-1">
          <p>*Visitor counts are summed from daily unique counts (a person active on 3 days counts 3 times over a range).</p>
          <p><strong>Bounce</strong> = session with ≤1 page view and &lt;10s engaged time. <strong>Engagement rate</strong> = sessions with ≥2 page views or ≥10s engaged. <strong>Registration conversion</strong> = sign-ups ÷ guest visitors.</p>
          <EstimateNote />
        </div>
      </div>
    );
  } else if (tab === "funnels") {
    const { data } = await supabase.rpc("analytics_funnel", { p_from: from, p_to: to });
    body = (
      <Card title="Homepage → Sign Up → Email Verified → First Content Copy → First AI Generation">
        <Funnel steps={(data ?? []) as { step: string; count: number }[]} />
        <p className="mt-4 text-xs text-muted">Step 1 counts guest sessions that landed on the homepage. Steps 2–5 follow members who registered in the selected period.</p>
      </Card>
    );
  } else {
    const [ret, weekly, monthly] = await Promise.all([
      supabase.rpc("analytics_retention", { p_from: r.from, p_to: r.to }),
      supabase.from("user_retention_cohorts").select("*").eq("cohort_type", "week").order("cohort_start").order("period"),
      supabase.from("user_retention_cohorts").select("*").eq("cohort_type", "month").order("cohort_start").order("period"),
    ]);
    const R = (ret.data ?? {}) as Record<string, number>;
    const cohortTable = (rows: { cohort_start: string; period: number; cohort_size: number; retained: number }[], unit: string) => {
      const starts = [...new Set(rows.map((x) => x.cohort_start))];
      const maxP = Math.max(0, ...rows.map((x) => x.period));
      return starts.length === 0 ? <p className="text-sm text-muted">Cohorts are computed nightly by the “Analytics rollup (yesterday)” job.</p> : (
        <div className="overflow-x-auto"><table className="table-clean"><thead><tr><th>Cohort</th><th>Size</th>{Array.from({ length: maxP + 1 }, (_, i) => <th key={i}>{unit} {i}</th>)}</tr></thead>
          <tbody>{starts.map((s) => {
            const cells = rows.filter((x) => x.cohort_start === s);
            const size = cells[0]?.cohort_size ?? 0;
            return <tr key={s}><td>{s}</td><td>{size}</td>{Array.from({ length: maxP + 1 }, (_, i) => {
              const c = cells.find((x) => x.period === i);
              const v = c && size ? c.retained / size : null;
              return <td key={i} style={{ background: v !== null ? `rgba(57,135,229,${0.1 + v * 0.8})` : undefined }}>{v !== null ? `${Math.round(v * 100)}%` : ""}</td>;
            })}</tr>;
          })}</tbody></table></div>
      );
    };
    body = (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI label="Cohort (registered in range)" value={formatNumber(R.cohort_size)} />
          <KPI label="Day 1 retention" value={pct(R.d1 ?? 0, R.eligible_d1 ?? 0)} sub={`${R.d1 ?? 0} of ${R.eligible_d1 ?? 0} eligible`} />
          <KPI label="Day 7 retention" value={pct(R.d7 ?? 0, R.eligible_d7 ?? 0)} sub={`${R.d7 ?? 0} of ${R.eligible_d7 ?? 0} eligible`} />
          <KPI label="Day 30 retention" value={pct(R.d30 ?? 0, R.eligible_d30 ?? 0)} sub={`${R.d30 ?? 0} of ${R.eligible_d30 ?? 0} eligible`} />
        </div>
        <p className="text-xs text-muted">Day-N retention = members active (meaningful active day) exactly N days after registration ÷ members whose day N has already passed.</p>
        <Card title="Weekly retention cohorts">{cohortTable((weekly.data ?? []) as never, "Week")}</Card>
        <Card title="Monthly retention cohorts">{cohortTable((monthly.data ?? []) as never, "Month")}</Card>
      </div>
    );
  }
  return (
    <div>
      <AdminHeader title="Website" gold="Analytics" description={`First-party analytics · ${r.label} (${r.from} → ${r.to}, UTC)`}
        actions={<RangePicker current={r.key} from={r.from} to={r.to} keep={{ tab }} />} />
      <Tabs tabs={tabs} current={tab} />
      {body}
    </div>
  );
}
