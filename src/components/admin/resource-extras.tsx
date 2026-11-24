import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/admin/ui";
import { formatDate, formatNumber } from "@/lib/utils";
import { RunSourceButton } from "@/components/admin/run-buttons";
import { CampaignSendButton } from "@/components/admin/campaign-send";

async function perf(type: string, id: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("content_analytics_summary").select("views,unique_viewers,copies,unique_copiers,saves,shares,ai_actions,last_accessed_at").eq("content_type", type).eq("content_id", id);
  const rows = data ?? [];
  const sum = (k: string) => rows.reduce((a, r) => a + Number((r as Record<string, unknown>)[k] ?? 0), 0);
  return { views: sum("views"), viewers: sum("unique_viewers"), copies: sum("copies"), copiers: sum("unique_copiers"), saves: sum("saves"), shares: sum("shares"), ai: sum("ai_actions"),
    last: rows.map((r) => r.last_accessed_at).filter(Boolean).sort().at(-1) as string | undefined };
}

function PerfCard({ p, copies }: { p: Awaited<ReturnType<typeof perf>>; copies?: boolean }) {
  return (
    <Card title="Performance (aggregated)">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-xs text-muted">Views</dt><dd className="font-semibold">{formatNumber(p.views)}</dd></div>
        <div><dt className="text-xs text-muted">Unique viewers*</dt><dd className="font-semibold">{formatNumber(p.viewers)}</dd></div>
        {copies && <><div><dt className="text-xs text-muted">Copies</dt><dd className="font-semibold">{formatNumber(p.copies)}</dd></div>
          <div><dt className="text-xs text-muted">Unique copiers*</dt><dd className="font-semibold">{formatNumber(p.copiers)}</dd></div></>}
        <div><dt className="text-xs text-muted">Saves</dt><dd className="font-semibold">{formatNumber(p.saves)}</dd></div>
        <div><dt className="text-xs text-muted">Shares</dt><dd className="font-semibold">{formatNumber(p.shares)}</dd></div>
        <div><dt className="text-xs text-muted">AI actions</dt><dd className="font-semibold">{formatNumber(p.ai)}</dd></div>
        <div><dt className="text-xs text-muted">Last accessed</dt><dd className="font-semibold">{p.last ? formatDate(p.last) : "—"}</dd></div>
      </dl>
      <p className="mt-2 text-[11px] text-muted">*Sum of daily unique counts. Updated by the analytics rollup job.</p>
    </Card>
  );
}

export async function ResourceExtras({ resourceKey, id, row }: { resourceKey: string; id: string; row: Record<string, unknown> | null }) {
  const supabase = await createSupabaseServer();
  if (resourceKey === "news") {
    const [{ data: revs }, p] = await Promise.all([
      supabase.from("editorial_revisions").select("id,created_at,note,snapshot").eq("article_id", id).order("created_at", { ascending: false }).limit(10),
      perf("article", id),
    ]);
    return (
      <>
        <Card title="AI assistance">
          <Link href={`/admin/ai-studio?source=article&id=${id}`} className="btn-gold h-9 w-full px-3 text-sm">Generate summary / posts</Link>
          <p className="mt-2 text-xs text-muted">Generated text opens in the admin studio for review — nothing is published automatically.</p>
        </Card>
        <PerfCard p={p} />
        <Card title="Revision history">
          {(revs ?? []).length === 0 ? <p className="text-xs text-muted">No earlier revisions.</p> : (
            <ul className="space-y-2 text-xs">{revs!.map((r) => (
              <li key={r.id} className="rounded bg-white/5 p-2"><span className="block text-muted">{formatDate(r.created_at, "UTC", true)}</span>
                <span className="line-clamp-2">{String((r.snapshot as Record<string, unknown>).title ?? "")} · {String((r.snapshot as Record<string, unknown>).status ?? "")}</span></li>
            ))}</ul>
          )}
        </Card>
      </>
    );
  }
  if (resourceKey === "prompts") return <PerfCard p={await perf("banner_prompt", id)} copies />;
  if (resourceKey === "scripts") return <PerfCard p={await perf("video_script", id)} copies />;
  if (resourceKey === "brokers") {
    const [{ count: followers }, { count: articles }, p] = await Promise.all([
      supabase.from("favourite_brokers").select("user_id", { count: "exact", head: true }).eq("broker_id", id),
      supabase.from("news_articles").select("id", { count: "exact", head: true }).eq("broker_id", id),
      perf("broker", id),
    ]);
    return (
      <>
        <Card title="Audience">
          <p className="text-sm">Followers: <strong>{followers ?? "—"}</strong></p>
          <p className="text-sm">Related articles: <strong>{articles ?? 0}</strong></p>
          <div className="mt-3 flex flex-col gap-1 text-sm">
            <Link className="text-gold-400 hover:underline" href={`/admin/r/regulations/new?broker_id=${id}`}>+ Add regulation (with source)</Link>
            <Link className="text-gold-400 hover:underline" href={`/admin/r/promotions/new?broker_id=${id}`}>+ Add promotion</Link>
            <Link className="text-gold-400 hover:underline" href={`/admin/r/reviews/new?broker_id=${id}`}>+ Add review</Link>
          </div>
        </Card>
        <PerfCard p={p} />
      </>
    );
  }
  if (resourceKey === "sources") {
    const [{ data: runs }, { data: errs }] = await Promise.all([
      supabase.from("news_source_runs").select("id,started_at,status,fetched,inserted,duplicates,queued_for_review,error").eq("source_id", id).order("started_at", { ascending: false }).limit(8),
      supabase.from("news_source_errors").select("id,occurred_at,message,http_status").eq("source_id", id).order("occurred_at", { ascending: false }).limit(5),
    ]);
    return (
      <>
        <Card title="Collection">
          <RunSourceButton sourceId={id} />
          <p className="mt-2 text-xs text-muted">Next run: {row?.next_run_at ? formatDate(String(row.next_run_at), "UTC", true) : "—"} UTC</p>
        </Card>
        <Card title="Recent runs">
          <ul className="space-y-1 text-xs">{(runs ?? []).map((r) => (
            <li key={r.id} className="rounded bg-white/5 p-2">{formatDate(r.started_at, "UTC", true)} · <strong>{r.status}</strong> · {r.fetched} fetched, {r.inserted} new, {r.duplicates} dup, {r.queued_for_review} review{r.error && <span className="block text-red-300">{r.error}</span>}</li>
          ))}{(runs ?? []).length === 0 && <li className="text-muted">No runs yet.</li>}</ul>
        </Card>
        {(errs ?? []).length > 0 && (
          <Card title="Recent errors"><ul className="space-y-1 text-xs text-red-300">{errs!.map((e) => <li key={e.id}>{formatDate(e.occurred_at, "UTC", true)} {e.http_status && `[${e.http_status}]`} {e.message}</li>)}</ul></Card>
        )}
      </>
    );
  }
  if (resourceKey === "segments" && row) {
    const { data: ids, error } = await supabase.rpc("segment_user_ids", { p_rules: row.rules ?? {} });
    const list = (ids ?? []) as { user_id: string }[];
    return (
      <Card title="Segment preview">
        {error ? <p className="text-xs text-red-300">{error.message}</p> : <p className="text-2xl font-bold">{formatNumber(list.length)} <span className="text-sm font-normal text-muted">members</span></p>}
        <div className="mt-3 flex flex-col gap-1 text-sm">
          <Link href={`/admin/users?segment=${id}`} className="text-gold-400 hover:underline">View members</Link>
          <a href={`/api/admin/export?report=segment&segment=${id}&format=csv`} className="text-gold-400 hover:underline">Export CSV</a>
          <Link href={`/admin/notifications?segment=${id}`} className="text-gold-400 hover:underline">Notify this segment (consented)</Link>
        </div>
      </Card>
    );
  }
  if (resourceKey === "campaigns" && row) return <Card title="Delivery"><CampaignSendButton id={id} status={String(row.status)} /></Card>;
  if ((resourceKey === "messages" || resourceKey === "enquiries") && row?.email) {
    return <Card title="Reply"><a href={`mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.subject ?? "your enquiry"}`)}`} className="btn-gold h-9 w-full text-sm">Reply by email</a><p className="mt-2 text-xs text-muted">Set status to “Replied” after responding.</p></Card>;
  }
  if (resourceKey === "requests" && row?.user_id) {
    return <Card title="Member"><Link href={`/admin/users/${row.user_id}`} className="text-gold-400 hover:underline">Open user profile</Link></Card>;
  }
  return null;
}
