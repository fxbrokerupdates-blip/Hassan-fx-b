"use client";
import { useRouter } from "next/navigation";
import { markNotificationAction } from "@/app/dashboard/actions";
import { track } from "@/lib/analytics/client";

export function NotificationLink({ id, href, title }: { id: string; href: string | null; title: string }) {
  const router = useRouter();
  const safe = href && (href.startsWith("/") && !href.startsWith("//")) ? href : null;
  return (
    <button type="button" className="text-left font-semibold hover:text-gold-400"
      onClick={async () => {
        track("notification_open", { content_type: "notification", content_id: id });
        await markNotificationAction(id, true);
        if (safe) router.push(safe); else router.refresh();
      }}>
      {title}
    </button>
  );
}
