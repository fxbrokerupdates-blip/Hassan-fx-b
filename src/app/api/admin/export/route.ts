import { getViewer, can } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { toCsv } from "@/lib/admin/csv";
import { audit } from "@/lib/admin/audit";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const REPORTS: Record<string, { perm: string; pii?: boolean }> = {
  users: { perm: "users.export", pii: true }, segment: { perm: "users.export", pii: true }, daily: { perm: "analytics.export" },
  engagement: { perm: "analytics.export" }, rankings: { perm: "analytics.export" }, content: { perm: "analytics.export" },
  ai_usage: { perm: "analytics.export" }, traffic_sources: { perm: "analytics.export" }, registrations: { perm: "analytics.export" },
  retention: { perm: "analytics.export" }, brokers: { perm: "analytics.export" },
};

const isDate = (s: string | null) => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));

/** Permission-checked CSV export. Every export is logged (analytics_reports + audit log). */
export async function GET(req: Request) {
  const viewer = await getViewer();
  const url = new URL(req.url);
  const report = url.searchParams.get("report") ?? "";
  const def = REPORTS[report];
  if (!viewer || !viewer.isStaff || !def || !can(viewer, def.perm)) return new Response("Not found", { status: 404 });
  if (!(await rateLimit(`export:${viewer.id}`, 600, 30))) return new Response("Too many exports", { status: 429 });
  const pii = Boolean(def.pii && can(viewer, "users.pii"));
  const today = new Date().toISOString().slice(0, 10);
  const from = isDate(url.searchParams.get("from")) ? url.searchParams.get("from")! : new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10);
  const to = isDate(url.searchParams.get("to")) ? url.searchParams.get("to")! : today;
  const fromTs = `${from}T00:00:00Z`, toTs = new Date(new Date(`${to}T00:00:00Z`).getTime() + 86400_000).toISOString();
  const s = await createSupabaseServer();
  let rows: Record<string, unknown>[] = [];

  const pageAll = async (build: (a: number, b: number) => PromiseLike<{ data: unknown[] | null }>) => {
    const out: Record<string, unknown>[] = [];
    for (let i = 0; i < 50; i++) {
      const { data } = await build(i * 1000, i * 1000 + 999);
      const d = (data ?? []) as Record<string, unknown>[];
      out.push(...d);
      if (d.length < 1000) break;
    }
    return out;
  };

  switch (report) {
    case "users":
    case "segment": {
      let ids: string[] | null = null;
      if (report === "segment") {
        const { data: seg } = await s.from("user_segments").select("rules").eq("id", url.searchParams.get("segment") ?? "").maybeSingle();
        if (!seg) return new Response("Segment not found", { status: 404 });
        const { data } = await s.rpc("segment_user_ids", { p_rules: seg.rules });
        ids = ((data ?? []) as { user_id: string }[]).map((x) => x.user_id);
      }
      const cols = `id,full_name,${pii ? "email,phone_country_code,phone," : ""}country,profession,status,email_verified_at,created_at,last_login_at,last_active_at`;
      rows = await pageAll((a, b) => {
        let q = s.from("profiles").select(cols).order("created_at");
        if (ids) q = q.in("id", ids.length ? ids.slice(0, 5000) : ["00000000-0000-0000-0000-000000000000"]);
        return q.range(a, b);
      });
      break;
    }
    case "daily": {
      const { data } = await s.from("daily_analytics_summary").select("*").gte("day", from).lte("day", to).order("day");
      const act = await pageAll((a, b) => s.from("daily_user_activity").select("day,user_id").eq("is_active_day", true).gte("day", from).lte("day", to).range(a, b));
      const dau = new Map<string, number>();
      for (const r of act) dau.set(String(r.day), (dau.get(String(r.day)) ?? 0) + 1);
      rows = (data ?? []).map((d) => ({ ...d, daily_active_members: dau.get(d.day) ?? 0 }));
      break;
    }
    case "engagement": {
      const uid = url.searchParams.get("user") ?? "";
      if (!/^[0-9a-f-]{36}$/.test(uid) || !can(viewer, "analytics.users")) return new Response("Not found", { status: 404 });
      const { data } = await s.from("daily_user_activity").select("*").eq("user_id", uid).gte("day", from).lte("day", to).order("day");
      rows = data ?? [];
      break;
    }
    case "rankings": {
      const { data } = await s.rpc("get_leaderboard", { p_from: from, p_to: to, p_metric: url.searchParams.get("metric") ?? "score",
        p_country: url.searchParams.get("country") || null, p_profession: url.searchParams.get("profession") || null, p_status: null, p_limit: 500, p_offset: 0 });
      rows = data ?? [];
      break;
    }
    case "content": {
      const type = ["article", "banner_prompt", "video_script", "broker"].includes(url.searchParams.get("type") ?? "") ? url.searchParams.get("type")! : "article";
      const { data } = await s.rpc("content_performance", { p_type: type, p_from: from, p_to: to, p_order: "views", p_limit: 500 });
      rows = data ?? [];
      break;
    }
    case "ai_usage":
      rows = await pageAll((a, b) => s.from("ai_usage_logs").select("created_at,feature,provider,model,status,error_code,input_tokens,output_tokens,est_cost_usd,latency_ms").gte("created_at", fromTs).lt("created_at", toTs).order("created_at").range(a, b));
      break;
    case "traffic_sources": {
      const { data } = await s.rpc("analytics_breakdown", { p_from: fromTs, p_to: toTs, p_dimension: "traffic_source", p_limit: 100 });
      const { data: refs } = await s.rpc("analytics_breakdown", { p_from: fromTs, p_to: toTs, p_dimension: "referrer_host", p_limit: 100 });
      rows = [...(data ?? []).map((x: Record<string, unknown>) => ({ dimension: "source", ...x })), ...(refs ?? []).map((x: Record<string, unknown>) => ({ dimension: "referrer", ...x }))];
      break;
    }
    case "registrations":
      rows = await pageAll((a, b) => s.from("profiles").select("created_at,country,profession,email_verified_at").gte("created_at", fromTs).lt("created_at", toTs).order("created_at").range(a, b));
      break;
    case "retention": {
      const { data } = await s.from("user_retention_cohorts").select("*").order("cohort_type").order("cohort_start").order("period");
      rows = data ?? [];
      break;
    }
    case "brokers": {
      const { data } = await s.rpc("broker_follower_stats");
      rows = data ?? [];
      break;
    }
  }
  await s.from("analytics_reports").insert({ report_type: report, params: { from, to, segment: url.searchParams.get("segment") }, row_count: rows.length, contains_pii: pii, created_by: viewer.id });
  await audit("export_data", "analytics_reports", report, { rows: rows.length, pii, from, to });
  return new Response(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fxbu-${report}-${from}-to-${to}.csv"`, "Cache-Control": "no-store" },
  });
}
