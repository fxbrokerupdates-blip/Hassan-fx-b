import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requirePermission, can } from "@/lib/auth";

// Always render per request: these areas depend on the signed-in user.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin | FX Broker Updates" }, robots: { index: false, follow: false } };

const NAV: { href: string; label: string; icon: string; perm: string; group: string }[] = [
  { href: "/admin", label: "Overview", icon: "dashboard", perm: "dashboard.view", group: "Dashboard" },
  { href: "/admin/live", label: "Live Visitors", icon: "live", perm: "analytics.live", group: "Analytics" },
  { href: "/admin/analytics", label: "Website Analytics", icon: "chart", perm: "analytics.view", group: "Analytics" },
  { href: "/admin/rankings", label: "User Rankings", icon: "trophy", perm: "analytics.view", group: "Analytics" },
  { href: "/admin/content-performance", label: "Content Performance", icon: "trending", perm: "analytics.view", group: "Analytics" },
  { href: "/admin/r/segments", label: "Segments", icon: "users", perm: "analytics.view", group: "Analytics" },
  { href: "/admin/reports", label: "Reports & Export", icon: "download", perm: "analytics.export", group: "Analytics" },
  { href: "/admin/users", label: "Users", icon: "user", perm: "users.view", group: "Users" },
  { href: "/admin/staff", label: "Staff & Roles", icon: "shield", perm: "roles.manage", group: "Users" },
  { href: "/admin/r/requests", label: "Account Requests", icon: "file", perm: "users.manage", group: "Users" },
  { href: "/admin/r/news?news_type=broker", label: "Broker News", icon: "broker", perm: "news.view", group: "Content" },
  { href: "/admin/r/news?news_type=trading", label: "Trading News", icon: "trading", perm: "news.view", group: "Content" },
  { href: "/admin/r/categories", label: "Categories", icon: "tag", perm: "news.edit", group: "Content" },
  { href: "/admin/r/brokers", label: "Broker Directory", icon: "building", perm: "brokers.manage", group: "Content" },
  { href: "/admin/r/prompts", label: "Banner Prompts", icon: "image", perm: "prompts.manage", group: "Content" },
  { href: "/admin/r/scripts", label: "Video Scripts", icon: "video", perm: "scripts.manage", group: "Content" },
  { href: "/admin/r/reports", label: "Content Reports", icon: "flag", perm: "content_reports.manage", group: "Content" },
  { href: "/admin/media", label: "Media Library", icon: "image", perm: "dashboard.view", group: "Content" },
  { href: "/admin/r/sources", label: "News Sources", icon: "rss", perm: "sources.manage", group: "Automation" },
  { href: "/admin/jobs", label: "Jobs & Refresh", icon: "refresh", perm: "jobs.manage", group: "Automation" },
  { href: "/admin/ai-studio", label: "AI Creator Studio", icon: "sparkles", perm: "ai.use_admin", group: "Automation" },
  { href: "/admin/ai-settings", label: "AI Settings", icon: "cpu", perm: "ai.settings", group: "Automation" },
  { href: "/admin/automation", label: "Daily Automation", icon: "clock", perm: "automation.manage", group: "Automation" },
  { href: "/admin/homepage", label: "Homepage Builder", icon: "home", perm: "homepage.manage", group: "Marketing" },
  { href: "/admin/r/ads", label: "Advertisements", icon: "megaphone", perm: "ads.manage", group: "Marketing" },
  { href: "/admin/notifications", label: "Notifications", icon: "bell", perm: "notifications.manage", group: "Marketing" },
  { href: "/admin/r/campaigns", label: "Newsletter", icon: "mail", perm: "newsletter.manage", group: "Marketing" },
  { href: "/admin/r/subscribers", label: "Subscribers", icon: "users", perm: "newsletter.manage", group: "Marketing" },
  { href: "/admin/r/messages", label: "Inbox", icon: "inbox", perm: "inbox.manage", group: "Support" },
  { href: "/admin/r/enquiries", label: "Ad Enquiries", icon: "inbox", perm: "inbox.manage", group: "Support" },
  { href: "/admin/settings", label: "Global Settings", icon: "settings", perm: "settings.manage", group: "System" },
  { href: "/admin/r/flags", label: "Feature Flags", icon: "toggle", perm: "settings.manage", group: "System" },
  { href: "/admin/r/redirects", label: "Redirects", icon: "link", perm: "settings.manage", group: "System" },
  { href: "/admin/audit", label: "Audit Logs", icon: "file", perm: "audit.view", group: "System" },
  { href: "/admin/health", label: "System Health", icon: "activity", perm: "health.view", group: "System" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requirePermission("dashboard.view");
  const items = NAV.filter((n) => can(viewer, n.perm));
  return (
    <AdminShell items={items} user={{ name: viewer.profile?.full_name || "Staff", email: viewer.email, roles: viewer.roles }}>
      {children}
    </AdminShell>
  );
}
