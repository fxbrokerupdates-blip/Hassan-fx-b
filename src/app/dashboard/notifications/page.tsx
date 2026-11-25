import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ActionButton } from "@/components/member/action-button";
import { markAllNotificationsAction, markNotificationAction } from "@/app/dashboard/actions";
import { Empty } from "@/components/dashboard/widgets";
import { timeAgo, cn } from "@/lib/utils";
import { NotificationLink } from "@/components/member/notification-link";
import { pageNum, type RawParams } from "@/lib/params";
import { Pagination } from "@/components/news/pagination";

export const metadata = { title: "Notifications" };

const CATEGORY: Record<string, string> = { breaking_broker: "Breaking broker news", trading: "Important trading news", new_prompt: "New banner prompt",
  new_script: "New video script", followed_broker: "Followed broker", announcement: "Announcement", account: "Account notice" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const viewer = await requireUser();
  const page = pageNum(await searchParams);
  const supabase = await createSupabaseServer();
  const { data, count } = await supabase.from("user_notifications").select("id,read_at,created_at,notifications(title,body,link,category)", { count: "exact" })
    .eq("user_id", viewer.id).order("created_at", { ascending: false }).range((page - 1) * 30, page * 30 - 1);
  const rows = (data ?? []) as unknown as { id: string; read_at: string | null; created_at: string; notifications: { title: string; body: string | null; link: string | null; category: string } | null }[];
  return (
    <div className="space-y-5 fx-member-notifications">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Notification <span className="gold-text">Center</span></h2>
        <div className="flex gap-2">
          <Link href="/dashboard/settings#notifications" className="btn-outline h-9 px-3 text-sm">Preferences</Link>
          <ActionButton action={markAllNotificationsAction} className="btn-gold h-9 px-3 text-sm"><CheckCheck className="size-4" />Mark all as read</ActionButton>
        </div>
      </div>
      {rows.length === 0 ? <Empty>No notifications yet.</Empty> : (
        <ul className="card-plain divide-y divide-white/5">
          {rows.map((r) => r.notifications && (
            <li key={r.id} className={cn("flex items-start gap-3 p-4", !r.read_at && "bg-gold-500/5")}>
              <Bell className={cn("mt-1 size-5 shrink-0", r.read_at ? "text-white/40" : "text-gold-400")} />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-muted">{CATEGORY[r.notifications.category] ?? r.notifications.category} · {timeAgo(r.created_at)}</p>
                <NotificationLink id={r.id} href={r.notifications.link} title={r.notifications.title} />
                {r.notifications.body && <p className="mt-1 text-sm text-white/75">{r.notifications.body}</p>}
              </div>
              {!r.read_at && <ActionButton action={() => markNotificationAction(r.id)} className="text-xs text-gold-400 hover:underline">Mark read</ActionButton>}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} total={count ?? 0} pageSize={30} basePath="/dashboard/notifications" params={{}} />
    </div>
  );
}
