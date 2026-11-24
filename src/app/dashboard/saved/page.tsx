import Link from "next/link";
import { FolderPlus, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ActionButton } from "@/components/member/action-button";
import { ActionForm } from "@/components/member/form-action";
import { CollectionSelect } from "@/components/member/collection-select";
import { createCollectionAction, deleteCollectionAction, removeSavedAction } from "@/app/dashboard/actions";
import { Empty } from "@/components/dashboard/widgets";
import { formatDate } from "@/lib/utils";
import { oneOf, str, type RawParams } from "@/lib/params";
import { cn } from "@/lib/utils";

export const metadata = { title: "Saved Content" };
const TYPES = [["all", "All"], ["article", "News"], ["banner_prompt", "Banner prompts"], ["video_script", "Video scripts"], ["ai_generation", "AI content"], ["broker", "Brokers"]] as const;

export default async function SavedPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const type = oneOf(sp, "type", TYPES.map((t) => t[0])) ?? "all";
  const sort = oneOf(sp, "sort", ["new", "old"] as const) ?? "new";
  const q = str(sp, "q", 80);
  const col = str(sp, "collection", 40);
  const supabase = await createSupabaseServer();
  const { data: collections } = await supabase.from("user_collections").select("id,name").eq("user_id", viewer.id).order("name");
  let query = supabase.from("saved_content").select("id,content_type,content_id,title,created_at,collection_items(collection_id)").eq("user_id", viewer.id);
  if (type !== "all") query = query.eq("content_type", type);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query.order("created_at", { ascending: sort === "old" }).limit(300);
  let rows = (data ?? []) as unknown as { id: string; content_type: string; content_id: string; title: string | null; created_at: string; collection_items: { collection_id: string }[] }[];
  if (col) rows = rows.filter((r) => r.collection_items.some((c) => c.collection_id === col));

  // Resolve links for articles and brokers
  const articleIds = rows.filter((r) => r.content_type === "article").map((r) => r.content_id);
  const brokerIds = rows.filter((r) => r.content_type === "broker").map((r) => r.content_id);
  const [arts, brs] = await Promise.all([
    articleIds.length ? supabase.from("news_articles").select("id,slug").in("id", articleIds) : Promise.resolve({ data: [] }),
    brokerIds.length ? supabase.from("brokers").select("id,slug").in("id", brokerIds) : Promise.resolve({ data: [] }),
  ]);
  const slugOf = new Map<string, string>([...(arts.data ?? []).map((a) => [a.id, `/news/${a.slug}`] as [string, string]), ...(brs.data ?? []).map((b) => [b.id, `/brokers/${b.slug}`] as [string, string])]);
  const hrefFor = (r: (typeof rows)[number]) => slugOf.get(r.content_id) ?? (r.content_type === "banner_prompt" ? `/dashboard/prompts#prompt-${r.content_id}`
    : r.content_type === "video_script" ? `/dashboard/scripts#script-${r.content_id}` : r.content_type === "ai_generation" ? `/dashboard/history?id=${r.content_id}` : "#");
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ type, sort, q, collection: col, ...patch }).filter(([, v]) => v && v !== "all") as [string, string][]);
    return `/dashboard/saved${p.toString() ? `?${p}` : ""}`;
  };
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-bold">Saved <span className="gold-text">Content</span></h2>
      <div className="flex flex-wrap gap-2">
        {TYPES.map(([k, l]) => <Link key={k} href={link({ type: k })} className={cn("rounded-full px-3 py-1.5 text-sm ring-1", type === k ? "bg-gold-500 font-semibold text-navy-950 ring-gold-500" : "ring-white/15")}>{l}</Link>)}
      </div>
      <form className="card-plain flex flex-wrap gap-2 p-3">
        <input type="hidden" name="type" value={type} />
        <input name="q" defaultValue={q} placeholder="Search saved items…" className="input max-w-xs" aria-label="Search saved" />
        <select name="sort" defaultValue={sort} className="input w-40" aria-label="Sort"><option value="new">Newest first</option><option value="old">Oldest first</option></select>
        <select name="collection" defaultValue={col ?? ""} className="input w-48" aria-label="Collection"><option value="">All collections</option>{(collections ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button className="btn-gold px-4">Apply</button>
      </form>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="card-plain overflow-x-auto">
          {rows.length === 0 ? <div className="p-4"><Empty>No saved items here yet.</Empty></div> : (
            <table className="table-clean">
              <thead><tr><th>Item</th><th>Type</th><th>Saved</th><th>Collection</th><th className="sr-only">Actions</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={hrefFor(r)} className="font-medium hover:text-gold-400">{r.title ?? "Untitled"}</Link></td>
                    <td className="capitalize text-muted">{r.content_type.replace("_", " ")}</td>
                    <td className="whitespace-nowrap text-muted">{formatDate(r.created_at)}</td>
                    <td><CollectionSelect savedId={r.id} value={r.collection_items[0]?.collection_id ?? ""} collections={collections ?? []} /></td>
                    <td><ActionButton action={() => removeSavedAction(r.id)} title="Remove from saved" className="rounded p-1.5 text-red-300 hover:bg-white/10"><Trash2 className="size-4" /></ActionButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <aside className="card-plain h-fit p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display font-bold"><FolderPlus className="size-5 text-gold-400" />Collections</h3>
          <ul className="mb-3 space-y-1">
            {(collections ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={link({ collection: c.id })} className="hover:text-gold-400">{c.name}</Link>
                <ActionButton action={() => deleteCollectionAction(c.id)} confirmText={`Delete collection “${c.name}”? Saved items are kept.`} title="Delete collection" className="rounded p-1 text-white/50 hover:text-red-300"><Trash2 className="size-3.5" /></ActionButton>
              </li>
            ))}
          </ul>
          <ActionForm action={createCollectionAction} submit="Create">
            <input name="name" maxLength={60} required placeholder="New collection name" className="input" aria-label="Collection name" />
          </ActionForm>
        </aside>
      </div>
    </div>
  );
}
