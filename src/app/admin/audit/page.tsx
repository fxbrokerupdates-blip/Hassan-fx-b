import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { Pagination } from "@/components/news/pagination";
import { flatParams, pageNum, str, type RawParams } from "@/lib/params";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Audit Logs" };
export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requirePermission("audit.view");
  const sp = await searchParams;
  const page = pageNum(sp);
  const action = str(sp, "action", 60), resource = str(sp, "resource", 60), actor = str(sp, "actor", 80);
  const supabase = await createSupabaseServer();
  let q = supabase.from("admin_audit_logs").select("*", { count: "exact" });
  if (action) q = q.eq("action", action);
  if (resource) q = q.eq("resource", resource);
  if (actor) q = q.ilike("actor_email", `%${actor.replace(/[%_]/g, "")}%`);
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  return (
    <div>
      <AdminHeader title="Admin" gold="Audit Logs" description="Append-only record of administrative actions. Secrets and passwords are never logged; entries cannot be edited or deleted by staff." />
      <form className="card-plain mb-4 flex flex-wrap gap-2 p-3">
        <input name="actor" defaultValue={actor} placeholder="Actor email" className="input w-56" aria-label="Actor" />
        <input name="action" defaultValue={action} placeholder="Action (e.g. suspend_user)" className="input w-56" aria-label="Action" />
        <input name="resource" defaultValue={resource} placeholder="Resource (e.g. profiles)" className="input w-56" aria-label="Resource" />
        <button className="btn-gold h-10 px-4">Filter</button>
      </form>
      <div className="card-plain overflow-x-auto">
        <table className="table-clean"><thead><tr><th>When (UTC)</th><th>Admin</th><th>Action</th><th>Resource</th><th>ID</th><th>Summary</th><th>Result</th></tr></thead>
          <tbody>{(data ?? []).map((l) => (
            <tr key={l.id}><td className="whitespace-nowrap text-muted">{formatDate(l.created_at, "UTC", true)}</td><td>{l.actor_email ?? "system"}</td><td className="font-mono text-xs">{l.action}</td>
              <td className="font-mono text-xs">{l.resource}</td><td className="max-w-32 truncate font-mono text-xs">{l.resource_id}</td>
              <td className="max-w-96 text-xs text-muted">{JSON.stringify(l.summary).slice(0, 220)}</td><td>{l.result}</td></tr>
          ))}{(data ?? []).length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted">No entries.</td></tr>}</tbody></table>
      </div>
      <Pagination page={page} total={count ?? 0} pageSize={50} basePath="/admin/audit" params={flatParams(sp)} />
    </div>
  );
}
