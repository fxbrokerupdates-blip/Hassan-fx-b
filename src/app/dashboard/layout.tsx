import type { Metadata } from "next";
import { Shell, type ShellItem } from "@/components/dashboard/shell";
import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/data/site";

// Always render per request: these areas depend on the signed-in user.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | FX Broker Updates" }, robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireUser("/dashboard");
  const supabase = await createSupabaseServer();
  const [{ count: unread }, config, { data: access }] = await Promise.all([
    supabase.from("user_notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null),
    getSiteConfig(),
    supabase.from("user_feature_access").select("feature_key,enabled").eq("user_id", viewer.id),
  ]);
  const blocked = new Set((access ?? []).filter((a) => !a.enabled).map((a) => a.feature_key));
  const f = config.flags;
  const items: (ShellItem | false)[] = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/dashboard/news?type=broker", label: "Broker Updates", icon: "broker" },
    { href: "/dashboard/news?type=trading", label: "Trading Updates", icon: "trading" },
    { href: "/dashboard/news?type=all", label: "All News", icon: "news" },
    f.banner_prompts && !blocked.has("banner_prompts") && { href: "/dashboard/prompts", label: "Daily Banner Prompts", icon: "prompts" },
    f.video_scripts && !blocked.has("video_scripts") && { href: "/dashboard/scripts", label: "Daily Video Scripts", icon: "scripts" },
    f.ai_studio && !blocked.has("ai_studio") && { href: "/dashboard/studio", label: "AI Creator Studio", icon: "studio" },
    { href: "/dashboard/brokers", label: "Favourite Brokers", icon: "brokers" },
    { href: "/dashboard/ib", label: "IB Center", icon: "brokers" },
    { href: "/dashboard/trader", label: "Trader Workspace", icon: "trading" },
    { href: "/dashboard/community", label: "Community", icon: "brokers" },
    { href: "/dashboard/saved", label: "Saved Content", icon: "saved" },
    { href: "/dashboard/history", label: "My Content History", icon: "history" },
    { href: "/dashboard/notifications", label: "Notifications", icon: "bell", badge: unread ?? 0 },
    { href: "/dashboard/profile", label: "My Profile", icon: "user" },
    { href: "/dashboard/settings", label: "Settings", icon: "settings" },
    { href: "/dashboard/support", label: "Help & Support", icon: "help" },
  ];
  const bottom: ShellItem[] = [
    { href: "/dashboard", label: "Home", icon: "home" },
    { href: "/dashboard/news?type=all", label: "News", icon: "news" },
    { href: "/dashboard/prompts", label: "Free Tools", icon: "prompts" },
    { href: "/dashboard/studio", label: "AI Studio", icon: "studio" },
    { href: "/dashboard/profile", label: "Profile", icon: "user" },
  ];
  const desktop: (ShellItem|false)[] = [
    {href:"/dashboard",label:"Dashboard",icon:"dashboard"}, {href:"/dashboard/market-watch",label:"Market Watch",icon:"market"}, {href:"/dashboard/broker-directory",label:"Brokers",icon:"broker"}, {href:"/dashboard/brokers",label:"Favourite Brokers",icon:"brokers"}, {href:"/dashboard/trader",label:"Trading Workspace",icon:"trading"}, {href:"/dashboard/calendar",label:"Economic Calendar",icon:"calendar"}, {href:"/dashboard/news?type=all",label:"News & Analysis",icon:"news"}, {href:"/dashboard/tools",label:"Trading Tools",icon:"tools"}, f.banner_prompts&&!blocked.has("banner_prompts")&&{href:"/dashboard/prompts",label:"Daily Banner Prompts",icon:"prompts"}, f.video_scripts&&!blocked.has("video_scripts")&&{href:"/dashboard/scripts",label:"Daily Video Scripts",icon:"scripts"}, f.ai_studio&&!blocked.has("ai_studio")&&{href:"/dashboard/studio",label:"AI Creator Studio",icon:"studio"}, {href:"/dashboard/ib",label:"IB Center",icon:"broker"}, {href:"/dashboard/community",label:"Community",icon:"community"}, {href:"/dashboard/saved",label:"Saved Content",icon:"saved"}, {href:"/dashboard/history",label:"Content History",icon:"history"}, {href:"/dashboard/notifications",label:"Notifications",icon:"bell",badge:unread??0}, {href:"/dashboard/profile",label:"My Profile",icon:"user"}, {href:"/dashboard/settings",label:"Settings",icon:"settings"}, {href:"/dashboard/support",label:"Help & Support",icon:"help"}
  ];
  return (
    <Shell desktopItems={desktop.filter(Boolean) as ShellItem[]} unread={unread??0} items={items.filter(Boolean) as ShellItem[]} bottom={bottom} title="Member Dashboard"
      user={{ name: viewer.profile?.full_name || "Member", email: viewer.email, isStaff: viewer.isStaff }}>
      {children}
    </Shell>
  );
}
