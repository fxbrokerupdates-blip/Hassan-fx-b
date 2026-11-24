import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { RESOURCES, PK } from "@/lib/admin/resources";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, StatusBadge } from "@/components/admin/ui";
import { BulkBar } from "@/components/admin/bulk-table";
import { Pagination } from "@/components/news/pagination";
import { flatParams, pageNum, str, type RawParams } from "@/lib/params";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ resource: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params }: Props) {
  const r = RESOURCES[(await params).resource];
  return { title: r?.title ?? "Admin" };
}

export default async function ResourceList({ params, searchParams }: Props) {
  const { resource: key } = await params;
  const r = RESOURCES[key];
  if (!r) notFound();
  await requirePermission(r.permission === "news.edit" ? "news.view" : r.permission);
  const sp = await searchParams;
  const page = pageNum(sp);
  const q = str(sp, "q", 80);
  const pk = PK[r.table] ?? "id";
  const supabase = await createSupabaseServer();
  const SAMPLE_TABLES = new Set(["news_articles", "brokers", "banner_prompts", "video_scripts"]);
  const cols = r.select ?? [...new Set([pk, ...r.list.map((c) => c.name), r.order.column, ...(SAMPLE_TABLES.has(r.table) ? ["is_sample"] : [])])].join(",");
  let query = supabase.from(r.table).select(cols, { count: "exact" });
  for (const f of r.filters ?? []) {
    const v = str(sp, f.name, 40);
    if (v && f.options.some((o) => o.value === v)) query = query.eq(f.name, v);
  }
  if (q && r.search?.length) {
    const term = q.replace(/[%_,()*]/g, " ").trim();
    if (term) query = query.or(r.search.map((c) => `${c}.ilike.%${term}%`).join(","));
  }
  const { data, count, error } = await query.order(r.order.column, { ascending: Boolean(r.order.ascending), nullsFirst: false }).range((page - 1) * 25, page * 25 - 1);
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const createHref = `/admin/r/${key}/new${r.filters?.length && str(sp, r.filters[0].name) ? `?${r.filters[0].name}=${str(sp, r.filters[0].name)}` : ""}`;

  const cell = (row: Record<string, unknown>, c: (typeof r.list)[number]) => {
    const v = row[c.name];
    if (c.kind === "badge") return <StatusBadge value={v as string} />;
    if (c.kind === "date") return <span className="whitespace-nowrap text-muted">{v ? formatDate(v as string, "UTC", true) : "—"}</span>;
    if (c.kind === "bool") return v ? <span className="text-emerald-400">✓</span> : <span className="text-white/30">—</span>;
    if (c.kind === "relation") {
      const o = v as Record<string, string> | null;
      return <span className="text-white/80">{o ? (o.name ?? o.full_name ?? o.email ?? "—") : "—"}</span>;
    }
    const s = v === null || v === undefined ? "—" : String(v);
    return <span className="line-clamp-2">{s.length > 120 ? `${s.slice(0, 120)}…` : s}</span>;
  };

  return (
    <div>
      <AdminHeader title={r.title} description={r.description}
        actions={r.canCreate !== false ? <Link href={createHref} className="btn-gold h-10 px-4"><Plus className="size-4" />New {r.singular}</Link> : undefined} />
      <form className="card-plain mb-4 flex flex-wrap items-center gap-2 p-3">
        {r.search && <input name="q" defaultValue={q} placeholder={`Search ${r.title.toLowerCase()}…`} className="input max-w-xs" aria-label="Search" />}
        {r.filters?.map((f) => (
          <select key={f.name} name={f.name} defaultValue={str(sp, f.name) ?? ""} className="input w-44" aria-label={f.label}>
            <option value="">All {f.label.toLowerCase()}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {(r.search || r.filters) && <button className="btn-gold h-10 px-4">Filter</button>}
        <span className="ml-auto text-sm text-muted">{(count ?? 0).toLocaleString()} records</span>
      </form>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error.message}</p>}
      <div className="mb-3"><BulkBar resource={key} ids={rows.map((x) => String(x[pk]))} statuses={r.bulkStatus ? [...r.bulkStatus.values] : undefined} canDelete={r.canDelete !== false} /></div>
      <div className="card-plain overflow-x-auto">
        <table className="table-clean">
          <thead><tr><th className="w-8"><span className="sr-only">Select</span></th>{r.list.map((c) => <th key={c.name}>{c.label}</th>)}<th className="sr-only">Edit</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={r.list.length + 2} className="p-8 text-center text-muted">No records yet.</td></tr>}
            {rows.map((row) => {
              const id = String(row[pk]);
              return (
                <tr key={id}>
                  <td><input type="checkbox" data-row value={id} aria-label="Select row" className="accent-[var(--primary-gold)]" /></td>
                  {r.list.map((c, i) => (
                    <td key={c.name}>
                      {i === 0 ? <Link href={`/admin/r/${key}/${encodeURIComponent(id)}`} className="font-medium hover:text-gold-400">{cell(row, c)}</Link> : cell(row, c)}
                      {i === 0 && row.is_sample ? <span className="badge-sample ml-2">Sample</span> : null}
                    </td>
                  ))}
                  <td><Link href={`/admin/r/${key}/${encodeURIComponent(id)}`} className="text-sm text-gold-400 hover:underline">Edit</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={count ?? 0} pageSize={25} basePath={`/admin/r/${key}`} params={flatParams(sp)} />
    </div>
  );
}
