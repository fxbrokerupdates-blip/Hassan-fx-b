import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card } from "@/components/admin/ui";

export const metadata = { title: "Staff & Roles" };

export default async function StaffPage() {
  await requirePermission("roles.manage");
  const supabase = await createSupabaseServer();
  const [{ data: roles }, { data: perms }, { data: rp }, { data: staff }] = await Promise.all([
    supabase.from("roles").select("*").order("rank", { ascending: false }),
    supabase.from("permissions").select("*").order("module").order("key"),
    supabase.from("role_permissions").select("*"),
    supabase.from("user_roles").select("user_id,role_key,created_at,roles!inner(is_staff,name),profiles!user_roles_user_id_fkey(full_name,email,status)").eq("roles.is_staff", true).order("created_at", { ascending: false }),
  ]);
  const has = (r: string, p: string) => r === "super_admin" || (rp ?? []).some((x) => x.role_key === r && x.permission_key === p);
  const staffRoles = (roles ?? []).filter((r) => r.is_staff);
  return (
    <div className="space-y-6">
      <AdminHeader title="Staff &" gold="Roles" description="Assign roles from a user's profile page. Only a Super Admin can grant Administrator or Super Admin. All changes are audit-logged." />
      <Card title="Staff members">
        <table className="table-clean"><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Since</th></tr></thead>
          <tbody>{((staff ?? []) as unknown as { user_id: string; role_key: string; created_at: string; roles: { name: string }; profiles: { full_name: string; email: string; status: string } | null }[]).map((s) => (
            <tr key={`${s.user_id}-${s.role_key}`}><td><Link href={`/admin/users/${s.user_id}`} className="hover:text-gold-400">{s.profiles?.full_name || s.profiles?.email}</Link><span className="block text-xs text-muted">{s.profiles?.email}</span></td>
              <td>{s.roles.name}</td><td className="capitalize">{s.profiles?.status}</td><td className="text-muted">{s.created_at.slice(0, 10)}</td></tr>
          ))}</tbody></table>
      </Card>
      <Card title="Permission matrix">
        <div className="overflow-x-auto"><table className="table-clean text-xs"><thead><tr><th>Permission</th>{staffRoles.map((r) => <th key={r.key} className="whitespace-nowrap">{r.name}</th>)}</tr></thead>
          <tbody>{(perms ?? []).map((p) => (
            <tr key={p.key}><td><span className="font-mono">{p.key}</span><span className="block text-muted">{p.description}</span></td>
              {staffRoles.map((r) => <td key={r.key} className="text-center">{has(r.key, p.key) ? <span className="text-emerald-400">●</span> : <span className="text-white/20">○</span>}</td>)}</tr>
          ))}</tbody></table></div>
        <p className="mt-2 text-xs text-muted">Role permissions are defined in the database (role_permissions) and enforced by Row Level Security as well as on the server.</p>
      </Card>
    </div>
  );
}
