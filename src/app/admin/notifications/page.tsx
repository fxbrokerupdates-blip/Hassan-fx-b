import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card, StatusBadge } from "@/components/admin/ui";
import { NotificationForm } from "@/components/admin/notification-form";
import { MARKETS } from "@/lib/defaults";
import { str, type RawParams } from "@/lib/params";
import { formatDate } from "@/lib/utils";
import { emailConfigured } from "@/lib/email";
import { serverEnv } from "@/lib/server-env";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsAdmin({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requirePermission("notifications.manage");
  const seg = str(await searchParams, "segment", 40);
  const supabase = await createSupabaseServer();
  const [{ data: segments }, { data: brokers }, { data: list }] = await Promise.all([
    supabase.from("user_segments").select("id,name").order("name"),
    supabase.from("brokers").select("id,name").eq("status", "active").order("name").limit(500),
    supabase.from("notifications").select("id,title,category,audience,status,scheduled_at,sent_at,recipients,created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  const stats = await Promise.all((list ?? []).map((n) => supabase.rpc("notification_stats", { p_notification: n.id })));
  return (
    <div className="max-w-6xl space-y-6">
      <AdminHeader title="Notification" gold="Center" description={`In-app delivery is active. Email: ${emailConfigured() ? "configured" : "not configured"} · Web push (OneSignal): ${serverEnv.oneSignalKey ? "configured" : "not configured"}.`} />
      <Card title="Create notification"><NotificationForm segments={segments ?? []} brokers={brokers ?? []} markets={[...MARKETS]} defaultSegment={seg} /></Card>
      <Card title="Recent notifications">
        <div className="overflow-x-auto"><table className="table-clean"><thead><tr><th>Title</th><th>Category</th><th>Audience</th><th>Status</th><th>Delivered</th><th>Read</th><th>Opened</th><th>When</th></tr></thead>
          <tbody>{(list ?? []).map((n, i) => {
            const st = (stats[i].data ?? {}) as { delivered?: number; read?: number; opened?: number };
            return <tr key={n.id}><td className="max-w-72">{n.title}</td><td className="text-xs">{n.category}</td><td className="text-xs">{(n.audience as { type: string }).type}</td><td><StatusBadge value={n.status} /></td>
              <td>{st.delivered ?? n.recipients}</td><td>{st.read ?? 0}</td><td>{st.opened ?? 0}</td><td className="whitespace-nowrap text-muted">{formatDate(n.sent_at ?? n.scheduled_at ?? n.created_at, "UTC", true)}</td></tr>;
          })}</tbody></table></div>
      </Card>
    </div>
  );
}
