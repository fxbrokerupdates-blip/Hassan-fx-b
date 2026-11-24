"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  Bell, Bookmark, Building2, FileText, Heart, History, Home, Image as ImageIcon, LayoutDashboard, LifeBuoy, LogOut, Menu,
  Newspaper, Settings, Shield, Sparkles, TrendingUp, User, Video, X,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

export interface ShellItem { href: string; label: string; icon: string; badge?: number }
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard, broker: Building2, trading: TrendingUp, news: Newspaper, prompts: ImageIcon, scripts: Video,
  studio: Sparkles, brokers: Heart, saved: Bookmark, history: History, bell: Bell, user: User, settings: Settings,
  help: LifeBuoy, home: Home, file: FileText, shield: Shield,
};

function isActive(pathname: string, search: URLSearchParams, href: string) {
  const [p, q] = href.split("?");
  if (p === "/dashboard") return pathname === "/dashboard";
  if (!pathname.startsWith(p)) return false;
  if (!q) return true;
  const want = new URLSearchParams(q);
  return [...want.entries()].every(([k, v]) => (search.get(k) ?? "all") === v);
}

function Nav({ items, onNavigate }: { items: ShellItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-0.5">
      {items.map((it) => {
        const Icon = ICONS[it.icon] ?? FileText;
        const active = isActive(pathname, sp, it.href);
        return (
          <Link key={it.href} href={it.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition",
              active ? "bg-gold-500 font-semibold text-navy-950" : "text-white/85 hover:bg-white/5 hover:text-white")}>
            <Icon className="size-[18px] shrink-0" />
            <span className="flex-1">{it.label}</span>
            {it.badge ? <span className={cn("rounded-full px-1.5 text-[11px] font-bold", active ? "bg-navy-950 text-gold-400" : "bg-hot text-white")}>{it.badge > 99 ? "99+" : it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Shell({ items, bottom, title, user, children, variant = "member", topLinks }: {
  items: ShellItem[]; bottom?: ShellItem[]; title: string; user: { name: string; email: string; isStaff: boolean };
  children: React.ReactNode; variant?: "member" | "admin"; topLinks?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-navy-950 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-white/10 bg-navy-900 p-4 scrollbar-thin lg:flex">
        <Logo className="mb-2" />
        <p className="mb-4 px-1 text-[11px] font-semibold uppercase tracking-widest text-gold-400">{variant === "admin" ? "Admin Panel" : "Member Area"}</p>
        <Suspense><Nav items={items} /></Suspense>
        <div className="mt-auto border-t border-white/10 pt-3">
          {user.isStaff && variant === "member" && (
            <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] text-white/85 hover:bg-white/5"><Shield className="size-[18px]" />Admin Panel</Link>
          )}
          {variant === "admin" && (
            <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] text-white/85 hover:bg-white/5"><LayoutDashboard className="size-[18px]" />Member Dashboard</Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[15px] text-white/85 hover:bg-white/5"><LogOut className="size-[18px]" />Logout</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-navy-900/95 px-4 backdrop-blur lg:px-8">
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="size-6" /></button>
          <h1 className="truncate font-display text-lg font-bold">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            {topLinks}
            <Link href="/" className="hidden text-sm text-white/70 hover:text-gold-400 sm:inline">View website</Link>
            <span className="hidden text-right text-xs leading-4 sm:block">
              <span className="block font-semibold">{user.name}</span>
              <span className="block text-muted">{user.email}</span>
            </span>
            <span className="grid size-8 place-items-center rounded-full bg-gold-500 font-bold text-navy-950">{user.name.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        <main id="main" className="px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>

      {bottom && (
        <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-navy-900/98 pb-[env(safe-area-inset-bottom)] lg:hidden">
          {bottom.map((it) => {
            const Icon = ICONS[it.icon] ?? FileText;
            return (
              <Link key={it.href} href={it.href} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-white/80 hover:text-gold-400">
                <Icon className="size-5" />{it.label}
              </Link>
            );
          })}
        </nav>
      )}

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[82%] max-w-xs overflow-y-auto bg-navy-900 p-4">
            <div className="mb-4 flex items-center justify-between"><Logo /><button onClick={() => setOpen(false)} aria-label="Close"><X className="size-6" /></button></div>
            <Suspense><Nav items={items} onNavigate={() => setOpen(false)} /></Suspense>
            <form action="/auth/signout" method="post" className="mt-4 border-t border-white/10 pt-3">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-white/85"><LogOut className="size-[18px]" />Logout</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
