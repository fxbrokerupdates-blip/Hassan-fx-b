import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { GenerationItem, type GenRow } from "@/components/member/generation-item";
import { Empty } from "@/components/dashboard/widgets";
import { CONTENT_TYPES } from "@/lib/ai/catalog";
import { pageNum, str, type RawParams } from "@/lib/params";
import { Pagination } from "@/components/news/pagination";

export const metadata = { title: "My Content History" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const type = str(sp, "type", 40);
  const focus = str(sp, "id", 40);
  const page = pageNum(sp);
  const supabase = await createSupabaseServer();
  // RLS: members can only ever read their own generations.
  let q = supabase.from("ai_generations").select("id,content_type,title,output,created_at,is_saved,source_type,source_id,provider,model", { count: "exact" })
    .eq("user_id", viewer.id).eq("status", "completed");
  if (type) q = q.eq("content_type", type);
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
  const rows = (data ?? []) as (GenRow & { source_id: string | null })[];
  const artIds = rows.filter((r) => r.source_type === "article" && r.source_id).map((r) => r.source_id!) ;
  const { data: arts } = artIds.length ? await supabase.from("news_articles").select("id,title").in("id", artIds) : { data: [] };
  const titleOf = new Map((arts ?? []).map((a) => [a.id, a.title]));
  return (
    <div className="space-y-5 fx-member-history">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">My Content <span className="gold-text">History</span></h2>
        <Link href="/dashboard/studio" className="btn-gold h-10 px-4">New creation</Link>
      </div>
      <form className="flex gap-2">
        <select name="type" defaultValue={type ?? ""} className="input max-w-xs" aria-label="Content type">
          <option value="">All content types</option>
          {CONTENT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button className="btn-gold px-4">Filter</button>
      </form>
      {rows.length === 0 ? <Empty>No generated content yet.</Empty> : (
        <div className="space-y-3">
          {rows.map((g) => (
            <GenerationItem key={g.id} open={g.id === focus}
              g={{ ...g, source_label: g.source_type === "article" ? titleOf.get(g.source_id ?? "") ?? "News article" : g.source_type.replace("_", " ") }}
              label={CONTENT_TYPES.find((c) => c.value === g.content_type)?.label ?? g.content_type} />
          ))}
        </div>
      )}
      <Pagination page={page} total={count ?? 0} pageSize={20} basePath="/dashboard/history" params={{ type }} />
    </div>
  );
}
