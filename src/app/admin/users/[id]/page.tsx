import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission, can } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card, KPI, StatusBadge, EstimateNote } from "@/components/admin/ui";
import { TimeChart } from "@/components/admin/charts";
import { NoteForm, RoleEditor, UserActions } from "@/components/admin/user-actions";
import { audit } from "@/lib/admin/audit";
import { PROFESSIONS, labelOf } from "@/lib/defaults";
import { countryName } from "@/lib/countries";
import { formatDate, formatDuration, formatNumber, cn } from "@/lib/utils";

export const metadata = { title: "User profile" };
export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, (m: Record<string, unknown>, title?: string) => string> = {
  login_success: () => "Logged in", logout: () => "Logged out", registration_completed: () => "Registered", email_verified: () => "Verified email",
  page_view: (m) => `Viewed ${String(m.title ?? "a page")}`, news_list_view: () => "Opened a news listing", article_open: (_, t) => `Opened article: ${t ?? "news"}`,
  article_engaged: (_, t) => `Read article: ${t ?? "news"}`, article_progress: (m) => `Reached ${m.milestone}% of an article`, news_saved: () => "Saved a news article",
  news_shared: () => "Shared a news article", source_link_click: () => "Opened an original source", broker_view: (_, t) => `Viewed broker ${t ?? ""}`,
  broker_follow: (_, t) => `Followed broker ${t ?? ""}`, broker_unfollow: (_, t) => `Unfollowed broker ${t ?? ""}`,
  banner_prompt_view: () => "Viewed a banner prompt", banner_prompt_copy: (_, t) => `Copied banner prompt: ${t ?? ""}`, banner_prompt_save: () => "Saved a banner prompt",
  video_script_view: () => "Viewed a video script", video_script_copy: (_, t) => `Copied video script: ${t ?? ""}`, video_script_save: () => "Saved a video script",
  ai_studio_open: () => "Opened AI Creator Studio", ai_generation_requested: (m) => `Requested AI ${String(m.type ?? "content").replace(/_/g, " ")}`,
  ai_generation_completed: (m) => `Generated ${String(m.type ?? "content").replace(/_/g, " ")}`, ai_generation_failed: () => "AI generation failed",
  ai_output_copy: () => "Copied generated content", ai_output_save: () => "Saved generated content", ai_output_download: () => "Downloaded generated content",
  search: () => "Searched", filter_used: () => "Used filters", notification_open: () => "Opened a notification", dott_plus_click: () => "Clicked Download Dott Plus",
  facebook_click: () => "Clicked Facebook", linkedin_click: () => "Clicked LinkedIn", external_link_click: () => "Clicked an external link",
  newsletter_signup: () => "Subscribed to newsletter", profile_updated: () => "Updated profile",
};

export default async function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePermission("users.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createSupabaseServer();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  const pii = can(viewer, "users.pii");
  const showAnalytics = can(viewer, "analytics.users");
  await audit("view_user_profile", "profiles", id, { pii });

  const [roles, allRoles, features, notes, summary, events, presence, rank] = await Promise.all([
    supabase.from("user_roles").select("role_key").eq("user_id", id),
    supabase.from("roles").select("key,name").order("rank", { ascending: false }),
    supabase.from("user_feature_access").select("feature_key,enabled").eq("user_id", id),
    supabase.from("admin_notes").select("id,note,created_at,author:profiles!admin_notes_author_id_fkey(full_name)").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    showAnalytics ? supabase.rpc("user_analytics_summary", { p_user: id }) : Promise.resolve({ data: null }),
    showAnalytics ? supabase.from("analytics_events").select("id,event_name,occurred_at,content_type,content_id,metadata,path").eq("user_id", id).neq("event_name", "page_view").order("occurred_at", { ascending: false }).limit(150) : Promise.resolve({ data: [] }),
    supabase.from("visitor_presence").select("current_path,last_heartbeat_at,state").eq("user_id", id).gte("last_heartbeat_at", new Date(Date.now() - 150_000).toISOString()).maybeSingle(),
    showAnalytics ? supabase.from("user_engagement_scores").select("*").eq("user_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const S = (summary.data ?? {}) as Record<string, number | unknown>;
  const score = (rank.data ?? S.score ?? null) as Record<string, number> | null;
  const evs = (events.data ?? []) as { id: number; event_name: string; occurred_at: string; content_type: string | null; content_id: string | null; metadata: Record<string, unknown> }[];
  // Resolve titles for content referenced in the timeline (metadata only — private generated text is never shown)
  const ids = (t: string) => [...new Set(evs.filter((e) => e.content_type === t && e.content_id).map((e) => e.content_id!))];
  const [arts, prs, scs, brs] = await Promise.all([
    ids("article").length ? supabase.from("news_articles").select("id,title").in("id", ids("article")) : Promise.resolve({ data: [] }),
    ids("banner_prompt").length ? supabase.from("banner_prompts").select("id,title").in("id", ids("banner_prompt")) : Promise.resolve({ data: [] }),
    ids("video_script").length ? supabase.from("video_scripts").select("id,title").in("id", ids("video_script")) : Promise.resolve({ data: [] }),
    ids("broker").length ? supabase.from("brokers").select("id,title:name").in("id", ids("broker")) : Promise.resolve({ data: [] }),
  ]);
  const titles = new Map<string, string>([...(arts.data ?? []), ...(prs.data ?? []), ...(scs.data ?? []), ...(brs.data ?? [])].map((x) => [x.id as string, String(x.title)]));
  const daily = (S.daily ?? []) as { day: string; engaged: number; score: number; active: boolean }[];
  const chart = daily.map((d) => ({ day: d.day.slice(5), "Engaged minutes": Math.round(d.engaged / 60) }));
  const activeDays = new Set(daily.filter((d) => d.active).map((d) => d.day));
  const calendar = Array.from({ length: 84 }, (_, i) => new Date(Date.now() - (83 - i) * 86400_000).toISOString().slice(0, 10));
  const feat = Object.fromEntries(["banner_prompts", "video_scripts", "ai_studio", "saved_content", "notifications"].map((k) => [k, (features.data ?? []).find((f) => f.feature_key === k)?.enabled !== false]));
  const n = (k: string) => formatNumber(Number(S[k] ?? 0));
  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-gold-400"><ArrowLeft className="size-4" />Users</Link>
      <AdminHeader title={p.full_name || "Member"} description={`User ID ${p.id}`}
        actions={<>{presence.data && <span className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-300"><span className="size-2 animate-pulse rounded-full bg-emerald-400" />Online · {presence.data.current_path}</span>}
          {showAnalytics && <a href={`/api/admin/export?report=engagement&user=${id}&from=2020-01-01`} className="btn-outline h-10 px-4 text-sm">Export activity</a>}</>} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Account overview" className="xl:col-span-2">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ["Full name", p.full_name || "—"], ["Email", pii ? p.email : "hidden"], ["Phone", pii ? (p.phone ? `${p.phone_country_code ?? ""} ${p.phone}` : "—") : "hidden"],
              ["Country", countryName(p.country)], ["Profession", labelOf(PROFESSIONS, p.profession)], ["Registered", formatDate(p.created_at, "UTC", true)],
              ["Verification", p.email_verified_at ? `Verified ${formatDate(p.email_verified_at)}` : "Unverified"], ["Status", <StatusBadge key="s" value={p.status} />],
              ["Last login", formatDate(p.last_login_at, "UTC", true)], ["Last active", formatDate(p.last_active_at, "UTC", true)],
              ["Roles", (roles.data ?? []).map((r) => r.role_key.replace(/_/g, " ")).join(", ")], ["AI daily limit", p.ai_daily_limit ?? "Default"],
            ].map(([k, v]) => <div key={String(k)} className="flex justify-between gap-3 border-b border-white/5 py-1.5"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>)}
          </dl>
          {p.suspended_reason && <p className="mt-3 text-sm text-red-300">Suspension reason: {p.suspended_reason}</p>}
        </Card>
        <Card title="Actions"><UserActions userId={id} status={p.status} verified={Boolean(p.email_verified_at)} aiLimit={p.ai_daily_limit} features={feat} canManage={can(viewer, "users.manage")} /></Card>
      </div>

      {showAnalytics ? (
        <>
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-gold-400">Engagement summary</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <KPI label="Engagement score" value={formatNumber(Math.round(Number(score?.total_score ?? 0)))} sub={`Rank #${score?.rank_all_time ?? "—"} overall`} tone="gold" />
              <KPI label="Total visits (days)" value={n("visits_days")} sub={`${n("sessions")} sessions`} />
              <KPI label="Total engaged time" value={formatDuration(Number(S.engaged_seconds ?? 0))} sub={`Avg session ${formatDuration(Number(S.avg_session_seconds ?? 0))}`} />
              <KPI label="Active days" value={n("active_days")} sub={`This week ${formatDuration(Number(S.week_engaged ?? 0))} · month ${formatDuration(Number(S.month_engaged ?? 0))}`} />
              <KPI label="Current streak" value={`${score?.current_streak ?? 0} days`} sub={`Longest ${score?.longest_streak ?? 0} days`} />
              <KPI label="Score 7d / 30d" value={`${Math.round(Number(score?.score_7d ?? 0))} / ${Math.round(Number(score?.score_30d ?? 0))}`} />
            </div>
          </section>
          <div className="grid gap-6 xl:grid-cols-3">
            <Card title="Feature usage">
              <ul className="space-y-1.5 text-sm">
                {[["Broker articles read", n("broker_articles")], ["Trading articles read", n("trading_articles")], ["Banner prompts viewed / copied", `${n("prompts_viewed")} / ${n("prompts_copied")}`],
                  ["Video scripts viewed / copied", `${n("scripts_viewed")} / ${n("scripts_copied")}`], ["AI generations completed", n("ai_generations")], ["Content saved", n("content_saved")],
                  ["Notifications opened", n("notifications_opened")], ["External promo links clicked", n("external_clicks")]].map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-white/5 pb-1"><span className="text-muted">{k}</span><strong>{v}</strong></li>))}
              </ul>
              <p className="mt-3 text-xs text-muted">Top categories: {((S.top_categories ?? []) as { name: string; n: number }[]).map((c) => `${c.name} (${c.n})`).join(", ") || "—"}</p>
              <p className="mt-1 text-xs text-muted">Most viewed brokers: {((S.top_brokers ?? []) as { name: string; n: number }[]).map((c) => `${c.name} (${c.n})`).join(", ") || "—"}</p>
              <p className="mt-1 text-xs text-muted">Following: {((S.followed_brokers ?? []) as string[]).join(", ") || "—"}</p>
            </Card>
            <Card title="Daily engaged minutes (90 days)" className="xl:col-span-2"><TimeChart data={chart} xKey="day" series={[{ key: "Engaged minutes", label: "Engaged minutes" }]} area height={220} /></Card>
          </div>
          <Card title="Activity calendar (last 12 weeks)">
            <div className="grid w-fit grid-flow-col grid-rows-7 gap-1" role="img" aria-label={`${activeDays.size} active days in the last 12 weeks`}>
              {calendar.map((d) => <span key={d} title={`${d}: ${activeDays.has(d) ? "active" : "inactive"}`} className={cn("size-3.5 rounded-sm", activeDays.has(d) ? "bg-gold-500" : "bg-white/10")} />)}
            </div>
            <p className="mt-2 text-xs text-muted">Gold = meaningful active day.</p>
          </Card>
          <Card title="Activity timeline (latest 150 recorded events)">
            {evs.length === 0 ? <p className="text-sm text-muted">No recorded activity.</p> : (
              <ol className="relative space-y-2 border-l border-white/10 pl-4 text-sm">
                {evs.map((e) => (
                  <li key={e.id}><span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-gold-500" />
                    <span className="mr-2 font-mono text-xs text-muted">{new Date(e.occurred_at).toISOString().replace("T", " ").slice(0, 16)} UTC</span>
                    {(EVENT_LABEL[e.event_name] ?? (() => e.event_name.replace(/_/g, " ")))(e.metadata ?? {}, e.content_id ? titles.get(e.content_id) : undefined)}
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-xs text-muted">Only recorded events are shown — never page content, keystrokes or private AI output.</p>
          </Card>
          <EstimateNote />
        </>
      ) : <p className="text-sm text-muted">You don’t have permission to view individual activity analytics.</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Admin-only support notes">
          <NoteForm userId={id} />
          <ul className="mt-4 space-y-2">{((notes.data ?? []) as unknown as { id: string; note: string; created_at: string; author: { full_name: string } | null }[]).map((nt) => (
            <li key={nt.id} className="rounded-lg bg-white/5 p-3 text-sm"><p className="whitespace-pre-wrap">{nt.note}</p><p className="mt-1 text-xs text-muted">{nt.author?.full_name ?? "Staff"} · {formatDate(nt.created_at, "UTC", true)}</p></li>
          ))}</ul>
        </Card>
        {can(viewer, "roles.manage") && <Card title="Staff roles & permissions"><RoleEditor userId={id} roles={allRoles.data ?? []} current={(roles.data ?? []).map((r) => r.role_key)} /></Card>}
      </div>
    </div>
  );
}
