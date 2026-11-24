"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  Activity, BarChart3, Bell, Building2, Clock, Cpu, Download, File, Flag, Home, Image as ImageIcon, Inbox, LayoutDashboard, Link2, LogOut, Mail,
  Megaphone, Menu, Radio, RefreshCw, Rss, Settings, Shield, Sparkles, Tag, ToggleLeft, TrendingUp, Trophy, User, Users, Video, X, Landmark, LineChart,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard, live: Radio, chart: BarChart3, trophy: Trophy, trending: TrendingUp, users: Users, download: Download, user: User,
  shield: Shield, file: File, broker: Landmark, trading: LineChart, tag: Tag, building: Building2, image: ImageIcon, video: Video, flag: Flag,
  rss: Rss, refresh: RefreshCw, sparkles: Sparkles, cpu: Cpu, clock: Clock, home: Home, megaphone: Megaphone, bell: Bell, mail: Mail,
  inbox: Inbox, settings: Settings, toggle: ToggleLeft, link: Link2, activity: Activity,
};
type Item = { href: string; label: string; icon: string; group: string };

function active(pathname: string, sp: URLSearchParams, href: string) {
  const [p, q] = href.split("?");
  if (p === "/admin") return pathname === "/admin";
  if (!pathname.startsWith(p)) return false;
  if (!q) return true;
  return [...new URLSearchParams(q).entries()].every(([k, v]) => sp.get(k) === v);
}

function Nav({ items, onNav }: { items: Item[]; onNav?: () => void }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Admin" className="space-y-4">
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{g}</p>
          {items.filter((i) => i.group === g).map((it) => {
            const Icon = ICONS[it.icon] ?? File;
            const on = active(pathname, sp, it.href);
            return (
              <Link key={it.href} href={it.href} onClick={onNav} aria-current={on ? "page" : undefined}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[14px]", on ? "bg-gold-500 font-semibold text-navy-950" : "text-white/80 hover:bg-white/5 hover:text-white")}>
                <Icon className="size-4 shrink-0" />{it.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ items, user, children }: { items: Item[]; user: { name: string; email: string; roles: string[] }; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const role = user.roles.find((r) => r !== "member")?.replace(/_/g, " ") ?? "staff";
  return (
    <div className="min-h-screen bg-navy-950 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-white/10 bg-navy-900 p-3 scrollbar-thin lg:flex">
        <Logo className="mb-1 px-2" />
        <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-widest text-gold-400">Admin Panel</p>
        <Suspense><Nav items={items} /></Suspense>
        <div className="mt-6 border-t border-white/10 pt-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[14px] text-white/80 hover:bg-white/5"><LayoutDashboard className="size-4" />Member dashboard</Link>
          <form action="/auth/signout" method="post"><button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-[14px] text-white/80 hover:bg-white/5"><LogOut className="size-4" />Logout</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-navy-900/95 px-4 backdrop-blur lg:px-8">
          <button className="lg:hidden" aria-label="Open admin menu" onClick={() => setOpen(true)}><Menu className="size-6" /></button>
          <span className="font-display font-bold">FX Broker Updates <span className="gold-text">Admin</span></span>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <Link href="/" target="_blank" className="hidden text-white/70 hover:text-gold-400 sm:inline">View site ↗</Link>
            <span className="hidden text-right leading-4 sm:block"><span className="block font-semibold">{user.name}</span><span className="capitalize text-muted">{role}</span></span>
            <span className="grid size-8 place-items-center rounded-full bg-gold-500 font-bold text-navy-950">{user.name.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        <main id="main" className="px-4 py-6 lg:px-8">{children}</main>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button aria-label="Close" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[84%] max-w-xs overflow-y-auto bg-navy-900 p-3">
            <div className="mb-3 flex items-center justify-between"><Logo /><button onClick={() => setOpen(false)} aria-label="Close"><X className="size-6" /></button></div>
            <Suspense><Nav items={items} onNav={() => setOpen(false)} /></Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
