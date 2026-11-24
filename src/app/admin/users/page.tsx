import Link from "next/link";
import { requirePermission, can } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, StatusBadge } from "@/components/admin/ui";
import { UserBulkBar } from "@/components/admin/user-bulk";
import { Pagination } from "@/components/news/pagination";
import { flatParams, oneOf, pageNum, str, dateParam, type RawParams } from "@/lib/params";
import { PROFESSIONS, labelOf } from "@/lib/defaults";
import { COUNTRIES, countryName } from "@/lib/countries";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const viewer = await requirePermission("users.view");
  const pii = can(viewer, "users.pii");
  const sp = await searchParams;
  const page = pageNum(sp);
  const q = str(sp, "q", 80)?.replace(/[%_,()*]/g, " ").trim();
  const country = str(sp, "country", 2);
  const profession = oneOf(sp, "profession", PROFESSIONS.map((p) => p.value));
  const status = oneOf(sp, "status", ["active", "suspended", "pending_deletion"] as const);
  const verified = oneOf(sp, "verified", ["yes", "no"] as const);
  const engagement = oneOf(sp, "engagement", ["active_7d", "active_30d", "inactive_30d", "online"] as const);
  const from = dateParam(sp, "from"), to = dateParam(sp, "to");
  const segment = str(sp, "segment", 40);
  const supabase = await createSupabaseServer();

  let restrict: string[] | null = null;
  const intersect = (ids: string[]) => { restrict = restrict ? restrict.filter((x) => ids.includes(x)) : ids; };
  if (segment) {
    const { data: seg } = await supabase.from("user_segments").select("rules").eq("id", segment).maybeSingle();
    const { data } = seg ? await supabase.rpc("segment_user_ids", { p_rules: seg.rules }) : { data: [] };
    intersect(((data ?? []) as { user_id: string }[]).map((x) => x.user_id));
  }
  if (engagement === "online") {
    const { data } = await supabase.from("visitor_presence").select("user_id").not("user_id", "is", null).gte("last_heartbeat_at", new Date(Date.now() - 150_000).toISOString());
    intersect((data ?? []).map((x) => x.user_id as string));
  } else if (engagement) {
    const rules = engagement === "active_7d" ? { active_within_days: 7 } : engagement === "active_30d" ? { active_within_days: 30 } : { inactive_for_days: 30 };
    const { data } = await supabase.rpc("segment_user_ids", { p_rules: rules });
    intersect(((data ?? []) as { user_id: string }[]).map((x) => x.user_id));
  }
  let query = supabase.from("profiles").select(`id,full_name,${pii ? "email," : ""}country,profession,status,email_verified_at,created_at,last_active_at,user_roles!user_roles_user_id_fkey(role_key)`, { count: "exact" });
  if (q) query = pii ? query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`) : query.ilike("full_name", `%${q}%`);
  if (country) query = query.eq("country", country);
  if (profession) query = query.eq("profession", profession);
  if (status) query = query.eq("status", status);
  if (verified) query = verified === "yes" ? query.not("email_verified_at", "is", null) : query.is("email_verified_at", null);
  if (from) query = query.gte("created_at", `${from}T00:00:00Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59Z`);
  if (restrict) query = query.in("id", (restrict as string[]).length ? (restrict as string[]).slice(0, 1000) : ["00000000-0000-0000-0000-000000000000"]);
  const { data, count, error } = await query.order("created_at", { ascending: false }).range((page - 1) * 30, page * 30 - 1);
  const rows = (data ?? []) as unknown as { id: string; full_name: string; email?: string; country: string | null; profession: string | null; status: string;
    email_verified_at: string | null; created_at: string; last_active_at: string | null; user_roles: { role_key: string }[] }[];
  const { data: online } = rows.length ? await supabase.from("visitor_presence").select("user_id").in("user_id", rows.map((r) => r.id)).gte("last_heartbeat_at", new Date(Date.now() - 150_000).toISOString()) : { data: [] };
  const onlineSet = new Set((online ?? []).map((o) => o.user_id));
  const exportQs = new URLSearchParams({ report: segment ? "segment" : "users", ...(segment ? { segment } : {}) });
  return (
    <div>
      <AdminHeader title="User" gold="Management" description={`${(count ?? 0).toLocaleString()} matching users${pii ? "" : " · emails hidden (no PII permission)"}`}
        actions={can(viewer, "users.export") ? <a href={`/api/admin/export?${exportQs}`} className="btn-outline h-10 px-4 text-sm">Export CSV</a> : undefined} />
      <form className="card-plain mb-4 grid gap-2 p-3 md:grid-cols-4 xl:grid-cols-8">
        {segment && <input type="hidden" name="segment" value={segment} />}
        <input name="q" defaultValue={q} placeholder={pii ? "Name or email…" : "Name…"} className="input xl:col-span-2" aria-label="Search users" />
        <select name="country" defaultValue={country ?? ""} className="input" aria-label="Country"><option value="">All countries</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
        <select name="profession" defaultValue={profession ?? ""} className="input" aria-label="Profession"><option value="">All professions</option>{PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
        <select name="status" defaultValue={status ?? ""} className="input" aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="pending_deletion">Pending deletion</option></select>
        <select name="verified" defaultValue={verified ?? ""} className="input" aria-label="Verification"><option value="">Verified or not</option><option value="yes">Verified</option><option value="no">Unverified</option></select>
        <select name="engagement" defaultValue={engagement ?? ""} className="input" aria-label="Engagement"><option value="">Any engagement</option><option value="online">Online now</option><option value="active_7d">Active last 7 days</option><option value="active_30d">Active last 30 days</option><option value="inactive_30d">Inactive 30+ days</option></select>
        <div className="flex gap-2"><input type="date" name="from" defaultValue={from} className="input" aria-label="Registered from" /><input type="date" name="to" defaultValue={to} className="input" aria-label="Registered to" /></div>
        <button className="btn-gold h-10 px-4">Filter</button>
      </form>
      {segment && <p className="mb-3 text-sm text-gold-400">Filtered by segment. <Link href="/admin/users" className="underline">Clear</Link></p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error.message}</p>}
      <div className="mb-3"><UserBulkBar canManage={can(viewer, "users.manage")} /></div>
      <div className="card-plain overflow-x-auto">
        <table className="table-clean">
          <thead><tr><th className="w-8" /><th>User</th><th>Online</th><th>Country</th><th>Profession</th><th>Roles</th><th>Status</th><th>Verified</th><th>Registered</th><th>Last active</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted">No users found.</td></tr>}
            {rows.map((u) => (
              <tr key={u.id}>
                <td><input type="checkbox" data-row value={u.id} aria-label="Select user" className="accent-[var(--primary-gold)]" /></td>
                <td><Link href={`/admin/users/${u.id}`} className="font-medium hover:text-gold-400">{u.full_name || "—"}</Link>{u.email && <span className="block text-xs text-muted">{u.email}</span>}</td>
                <td>{onlineSet.has(u.id) ? <span className="flex items-center gap-1.5 text-xs text-emerald-300"><span className="size-2 rounded-full bg-emerald-400" />Online</span> : <span className="text-xs text-muted">Offline</span>}</td>
                <td>{countryName(u.country)}</td><td>{labelOf(PROFESSIONS, u.profession)}</td>
                <td className="text-xs">{u.user_roles.filter((r) => r.role_key !== "member").map((r) => r.role_key.replace(/_/g, " ")).join(", ") || "member"}</td>
                <td><StatusBadge value={u.status} /></td><td>{u.email_verified_at ? <span className="text-emerald-400">✓</span> : <span className="text-amber-300">No</span>}</td>
                <td className="whitespace-nowrap text-muted">{formatDate(u.created_at)}</td><td className="whitespace-nowrap text-muted">{u.last_active_at ? timeAgo(u.last_active_at) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={count ?? 0} pageSize={30} basePath="/admin/users" params={flatParams(sp)} />
    </div>
  );
}
