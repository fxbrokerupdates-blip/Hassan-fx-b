import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { RESOURCES, PK } from "@/lib/admin/resources";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { loadRelationOptions } from "@/lib/admin/relations";
import { toInputValue } from "@/lib/admin/validate";
import { saveResourceAction } from "@/app/admin/r/actions";
import { ResourceForm, type FormField } from "@/components/admin/resource-form";
import { AdminHeader, Card } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";
import { str, type RawParams } from "@/lib/params";
import { ResourceExtras } from "@/components/admin/resource-extras";

type Props = { params: Promise<{ resource: string; id: string }>; searchParams: Promise<RawParams> };

export default async function ResourceEdit({ params, searchParams }: Props) {
  const { resource: key, id: rawId } = await params;
  const r = RESOURCES[key];
  if (!r) notFound();
  await requirePermission(r.permission);
  const sp = await searchParams;
  const isNew = rawId === "new";
  const id = decodeURIComponent(rawId);
  if (isNew && r.canCreate === false) notFound();
  const supabase = await createSupabaseServer();
  const pk = PK[r.table] ?? "id";
  let row: Record<string, unknown> | null = null;
  if (!isNew) {
    const { data } = await supabase.from(r.table).select("*").eq(pk, id).maybeSingle();
    if (!data) notFound();
    row = data;
  }
  const rel = await loadRelationOptions(r);
  let tags: string[] = [];
  if (r.table === "news_articles" && row) {
    const { data } = await supabase.from("news_article_tags").select("news_tags(name)").eq("article_id", id);
    tags = ((data ?? []) as unknown as { news_tags: { name: string } | null }[]).map((t) => t.news_tags?.name ?? "").filter(Boolean);
  }
  const fields: FormField[] = r.fields.map((f) => {
    let raw = row ? row[f.name] : (str(sp, f.name, 60) ?? (f.type === "date" ? new Date().toISOString().slice(0, 10) : f.default));
    if (f.name === "_tags") raw = tags;
    if (f.type === "readonly" && f.name.endsWith("_at") && raw) raw = formatDate(String(raw), "UTC", true);
    return {
      ...f, value: toInputValue(f, raw), checked: f.type === "boolean" ? Boolean(row ? row[f.name] : f.default) : undefined,
      relOptions: rel[f.name]?.filter((o) => o.value !== id),
    };
  });
  const action = saveResourceAction.bind(null, key, isNew ? null : id);
  const title = isNew ? `New ${r.singular}` : String(row?.[r.rowLabel] ?? r.singular);
  const publicHref = !isNew && row ? (r.table === "news_articles" && row.status === "published" ? `/news/${row.slug}` : r.table === "brokers" ? `/brokers/${row.slug}` : null) : null;
  return (
    <div className="max-w-5xl">
      <Link href={`/admin/r/${key}`} className="mb-3 inline-flex items-center gap-1 text-sm text-white/70 hover:text-gold-400"><ArrowLeft className="size-4" />{r.title}</Link>
      <AdminHeader title={title.length > 90 ? `${title.slice(0, 90)}…` : title} description={r.description}
        actions={publicHref ? <Link href={publicHref} target="_blank" className="btn-outline h-10 px-4">View live <ExternalLink className="size-4" /></Link> : undefined} />
      {sp.saved && <p role="status" className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">Created successfully.</p>}
      {row?.is_sample ? <p className="mb-4 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 p-3 text-sm text-fuchsia-100">This is development sample data. Delete it before launch.</p> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <ResourceForm action={action} fields={fields} notifyOption={["news_articles", "banner_prompts", "video_scripts"].includes(r.table)} />
        <div className="space-y-4">
          {!isNew && row && (
            <Card title="Record">
              <dl className="space-y-1 text-xs text-muted">
                <div><dt className="inline">ID: </dt><dd className="inline break-all font-mono">{String(row[pk])}</dd></div>
                {"created_at" in row && <div>Created: {formatDate(String(row.created_at), "UTC", true)}</div>}
                {"updated_at" in row && <div>Updated: {formatDate(String(row.updated_at), "UTC", true)}</div>}
              </dl>
            </Card>
          )}
          {!isNew && <ResourceExtras resourceKey={key} id={id} row={row} />}
        </div>
      </div>
    </div>
  );
}
