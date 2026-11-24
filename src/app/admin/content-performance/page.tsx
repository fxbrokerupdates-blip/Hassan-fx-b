import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Tabs } from "@/components/admin/ui";
import { RangePicker } from "@/components/admin/range-picker";
import { resolveRange } from "@/lib/admin/range";
import { oneOf, type RawParams } from "@/lib/params";
import { formatDate, formatDuration, formatNumber } from "@/lib/utils";

export const metadata = { title: "Content Performance" };
export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "news", label: "Most Read News", type: "article", order: "views" },
  { key: "trending_broker", label: "Trending Broker News", type: "article", order: "views", news: "broker" },
  { key: "trending_trading", label: "Trending Trading News", type: "article", order: "views", news: "trading" },
  { key: "prompts", label: "Most Copied Banner Prompts", type: "banner_prompt", order: "copies" },
  { key: "scripts", label: "Most Copied Video Scripts", type: "video_script", order: "copies" },
  { key: "saved", label: "Most Saved Content", type: "article", order: "saves" },
  { key: "brokers", label: "Most Popular Brokers", type: "broker", order: "views" },
] as const;

interface Row { content_id: string; title: string; published_at: string | null; views: number; unique_viewers: number; registered_views: number; guest_views: number;
  engaged_seconds: number; copies: number; unique_copiers: number; saves: number; shares: number; ai_actions: number; last_accessed_at: string | null }

export default async function ContentPerformance({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requirePermission("analytics.view");
  const sp = await searchParams;
  const view = VIEWS.find((v) => v.key === oneOf(sp, "view", VIEWS.map((v) => v.key))) ?? VIEWS[0];
  const r = resolveRange(sp, "7d");
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("content_performance", { p_type: view.type, p_from: r.from, p_to: r.to, p_order: view.order, p_limit: 100 });
  let rows = (data ?? []) as Row[];
  if ("news" in view) {
    const ids = rows.map((x) => x.content_id);
    const { data: types } = ids.length ? await supabase.from("news_articles").select("id,news_type").in("id", ids) : { data: [] };
    const allowed = new Set((types ?? []).filter((t) => t.news_type === view.news).map((t) => t.id));
    rows = rows.filter((x) => allowed.has(x.content_id));
  }
  const editHref = (id: string) => view.type === "article" ? `/admin/r/news/${id}` : view.type === "banner_prompt" ? `/admin/r/prompts/${id}` : view.type === "video_script" ? `/admin/r/scripts/${id}` : `/admin/r/brokers/${id}`;
  const copyCols = view.type === "banner_prompt" || view.type === "video_script";
  return (
    <div>
      <AdminHeader title="Content" gold="Performance" description={`${r.label} (${r.from} → ${r.to}) · from daily aggregates`} actions={<RangePicker current={r.key} from={r.from} to={r.to} keep={{ view: view.key }} />} />
      <Tabs current={view.key} tabs={VIEWS.map((v) => ({ key: v.key, label: v.label, href: `/admin/content-performance?view=${v.key}&range=${r.key}&from=${r.from}&to=${r.to}` }))} />
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error.message}</p>}
      <div className="card-plain overflow-x-auto">
        <table className="table-clean">
          <thead><tr><th>#</th><th>Title</th><th>Published</th><th>Views</th><th>Unique*</th><th>Members</th><th>Guests</th>{view.type === "article" && <th>Engaged</th>}
            {copyCols && <><th>Copies</th><th>Unique copiers*</th></>}<th>Saves</th><th>Shares</th><th>AI actions</th><th>Last accessed</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={14} className="p-8 text-center text-muted">No activity for this period yet.</td></tr>}
            {rows.map((x, i) => (
              <tr key={x.content_id}>
                <td>{i + 1}</td><td className="max-w-80"><Link href={editHref(x.content_id)} className="line-clamp-2 hover:text-gold-400">{x.title}</Link></td>
                <td className="whitespace-nowrap text-muted">{formatDate(x.published_at)}</td><td className="font-semibold">{formatNumber(x.views)}</td><td>{formatNumber(x.unique_viewers)}</td>
                <td>{formatNumber(x.registered_views)}</td><td>{formatNumber(x.guest_views)}</td>{view.type === "article" && <td>{formatDuration(x.engaged_seconds)}</td>}
                {copyCols && <><td className="font-semibold">{formatNumber(x.copies)}</td><td>{formatNumber(x.unique_copiers)}</td></>}
                <td>{formatNumber(x.saves)}</td><td>{formatNumber(x.shares)}</td><td>{formatNumber(x.ai_actions)}</td><td className="whitespace-nowrap text-muted">{formatDate(x.last_accessed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">*Unique counts are summed per day. Aggregates refresh hourly (or via “Recalculate now” on Rankings).</p>
    </div>
  );
}
