import Link from "next/link";
import { requirePermission, can } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card, KPI, EstimateNote } from "@/components/admin/ui";
import { TimeChart, BarsChart } from "@/components/admin/charts";
import { formatDuration, formatNumber, timeAgo } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

type Stats = {
  users: Record<string, number>; engagement: Record<string, number | string | null>; content: Record<string, number>;
  system: Record<string, number | string | null>;
};

export default async function AdminOverview() {
  const viewer = await requirePermission("dashboard.view");
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("admin_overview_stats");
  const s = (data ?? { users: {}, engagement: {}, content: {}, system: {} }) as Stats;
  const since = new Date(Date.now() - 29 * 86400_000).toISOString();
  const [series, daily, ai] = can(viewer, "analytics.view")
    ? await Promise.all([
        supabase.rpc("analytics_timeseries", { p_from: since, p_to: new Date().toISOString(), p_bucket: "day" }),
        supabase.from("daily_user_activity").select("day,is_active_day").gte("day", since.slice(0, 10)).eq("is_active_day", true).limit(50000),
        supabase.from("ai_usage_logs").select("created_at,status").gte("created_at", since).limit(20000),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const dauMap = new Map<string, number>();
  for (const r of (daily.data ?? []) as { day: string }[]) dauMap.set(r.day, (dauMap.get(r.day) ?? 0) + 1);
  const traffic = ((series.data ?? []) as { bucket: string; page_views: number; visitors: number }[]).map((r) => ({
    day: r.bucket.slice(5, 10), "Page views": r.page_views, Visitors: r.visitors, "Active members": dauMap.get(r.bucket.slice(0, 10)) ?? 0,
  }));
  const aiDays = new Map<string, { ok: number; fail: number }>();
  for (const r of (ai.data ?? []) as { created_at: string; status: string }[]) {
    const d = r.created_at.slice(5, 10);
    const e = aiDays.get(d) ?? { ok: 0, fail: 0 };
    if (r.status === "success") e.ok++; else e.fail++;
    aiDays.set(d, e);
  }
  const aiData = [...aiDays.entries()].sort().map(([day, v]) => ({ day, Successful: v.ok, Failed: v.fail }));
  const u = s.users, e = s.engagement, c = s.content, sys = s.system;
  return (
    <div className="space-y-6">
      <AdminHeader title="Admin" gold="Overview" description="Live figures from the database. Engagement time values are estimates."
        actions={<><Link href="/admin/live" className="btn-outline h-10 px-4">Live visitors</Link><Link href="/admin/r/news/new" className="btn-gold h-10 px-4">New article</Link></>} />
      {!isSupabaseConfigured && <p className="rounded-lg bg-amber-500/10 p-3 text-amber-200">Supabase is not configured.</p>}
      {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error.message}</p>}

      <section aria-label="User statistics">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-gold-400">Users</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <KPI label="Total registered" value={formatNumber(u.total)} tone="gold" />
          <KPI label="Online now (members)" value={formatNumber(u.online_registered)} sub={`${formatNumber(u.online_guests)} guests online`} tone="green" />
          <KPI label="New today" value={formatNumber(u.today)} sub={`Yesterday ${formatNumber(u.yesterday)}`} />
          <KPI label="New this week" value={formatNumber(u.week)} sub={`This month ${formatNumber(u.month)}`} />
          <KPI label="Verified" value={formatNumber(u.verified)} sub={`${formatNumber(u.unverified)} unverified`} />
          <KPI label="Suspended" value={formatNumber(u.suspended)} tone={u.suspended ? "red" : undefined} />
          <KPI label="DAU" value={formatNumber(u.dau)} sub="Active members today" />
          <KPI label="WAU" value={formatNumber(u.wau)} sub="Last 7 days" />
          <KPI label="MAU" value={formatNumber(u.mau)} sub="Last 30 days" />
          <KPI label="Returning (30d)" value={formatNumber(u.returning_30d)} sub="≥2 active days" />
          <KPI label="Inactive (30d)" value={formatNumber(u.inactive_30d)} />
          <KPI label="Avg engaged / active day" value={formatDuration(Number(e.avg_engaged_seconds_member_day ?? 0))} sub="Estimate" />
        </div>
      </section>

      <section aria-label="Engagement statistics">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-gold-400">Engagement</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <KPI label="Page views" value={formatNumber(Number(e.page_views))} />
          <KPI label="Sessions" value={formatNumber(Number(e.sessions))} sub={`Avg ${formatDuration(Number(e.avg_session_seconds ?? 0))} engaged`} />
          <KPI label="Articles read" value={formatNumber(Number(e.articles_read))} />
          <KPI label="Prompts viewed / copied" value={`${formatNumber(Number(e.prompts_viewed))} / ${formatNumber(Number(e.prompts_copied))}`} sub={`${formatNumber(Number(e.prompts_copied_today))} copied today`} />
          <KPI label="Scripts viewed / copied" value={`${formatNumber(Number(e.scripts_viewed))} / ${formatNumber(Number(e.scripts_copied))}`} />
          <KPI label="AI generations" value={formatNumber(Number(e.ai_generations))} sub={`${formatNumber(Number(e.ai_generations_today))} today`} />
          <KPI label="Saved items" value={formatNumber(Number(e.saved_content))} />
          <KPI label="Most popular broker" value={<span className="text-lg">{(e.most_popular_broker as string) ?? "—"}</span>} />
          <KPI label="Top category (30d)" value={<span className="text-lg">{(e.most_popular_category as string) ?? "—"}</span>} />
          <KPI label="Top feature (30d)" value={<span className="text-lg capitalize">{String(e.most_popular_feature ?? "—").replace(/_/g, " ")}</span>} />
        </div>
      </section>

      {can(viewer, "analytics.view") && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Traffic & active members — last 30 days" actions={<Link href="/admin/analytics" className="text-sm text-gold-400">Details →</Link>}>
            <TimeChart data={traffic} xKey="day" series={[{ key: "Visitors", label: "Visitors" }, { key: "Active members", label: "Active members" }]} />
          </Card>
          <Card title="AI requests — last 30 days" actions={<Link href="/admin/ai-settings" className="text-sm text-gold-400">AI settings →</Link>}>
            <BarsChart data={aiData} xKey="day" series={[{ key: "Successful", label: "Successful" }, { key: "Failed", label: "Failed" }]} />
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Content">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KPI label="Broker news" value={formatNumber(c.broker_published)} />
            <KPI label="Trading news" value={formatNumber(c.trading_published)} />
            <KPI label="Published today" value={formatNumber(c.published_today)} />
            <Link href="/admin/r/news?status=pending_review"><KPI label="Pending review" value={formatNumber(c.pending)} tone={c.pending ? "gold" : undefined} /></Link>
            <KPI label="Drafts / Scheduled" value={`${formatNumber(c.drafts)} / ${formatNumber(c.scheduled)}`} />
            <KPI label="Prompts / Scripts" value={`${formatNumber(c.banner_prompts)} / ${formatNumber(c.video_scripts)}`} />
          </div>
        </Card>
        <Card title="System">
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li>Active news sources: <strong>{String(sys.sources_active ?? 0)}</strong></li>
            <li>Failing sources: <strong className={Number(sys.sources_failed) ? "text-red-300" : ""}>{String(sys.sources_failed ?? 0)}</strong></li>
            <li>Last news refresh: <strong>{sys.last_news_refresh ? timeAgo(String(sys.last_news_refresh)) : "never"}</strong></li>
            <li>AI requests today: <strong>{String(sys.ai_requests_today ?? 0)}</strong> ({String(sys.ai_failed_today ?? 0)} failed)</li>
            <li>Errors (24h): <strong className={Number(sys.errors_24h) ? "text-red-300" : ""}>{String(sys.errors_24h ?? 0)}</strong></li>
            <li>Failed jobs: <strong>{String(sys.jobs_failed ?? 0)}</strong></li>
          </ul>
          <Link href="/admin/health" className="mt-3 inline-block text-sm text-gold-400">System health →</Link>
        </Card>
      </div>
      <EstimateNote />
    </div>
  );
}
