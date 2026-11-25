"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LayoutDashboard, LogOut, Menu, Search, Shield, User, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/db";

export interface HeaderViewer {
  name: string;
  isStaff: boolean;
  unread: number;
}

export function Header({ nav, logoUrl, siteName, premium = false }: { nav: NavItem[]; logoUrl: string; siteName: string; premium?: boolean }) {
  const [viewer, setViewer] = useState<HeaderViewer | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const top = nav.filter((n) => !n.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const children = (id: string) => nav.filter((n) => n.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]));

  // Viewer is loaded client-side so public pages stay cacheable.
  useEffect(() => {
    let alive = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setViewer(d?.user ? d.user as HeaderViewer : null); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenu(null);
        setProfileOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenu(null); setProfileOpen(false); setSearchOpen(false); setOpen(false); }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);

  // Close the drawer when navigating — handled in link onClick handlers below.
  const navigate = () => { setOpen(false); setMenu(null); };

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim();
    if (q) { setSearchOpen(false); setOpen(false); router.push(`/search?q=${encodeURIComponent(q)}`); }
  }

  return (
    <header ref={headerRef} className={cn("sticky top-0 z-50 border-b border-white/10 bg-navy-900/95 backdrop-blur supports-[backdrop-filter]:bg-navy-900/85", premium && "fx-pro-header")}>
      {premium && <div className="fx-pro-utility"><span>Global Forex &amp; Broker Intelligence</span><div><Link href="/news">Latest news</Link><Link href="/dashboard/trader">Watchlist</Link><Link href="/broker-warnings">Regulatory alerts</Link></div></div>}
      <div className="container-site flex h-[62px] items-center gap-4 fx-pro-header-main">
        <Logo src={logoUrl} name={siteName} priority />

        {premium && <form onSubmit={onSearch} role="search" className="fx-pro-header-search"><Search size={18}/><input name="q" aria-label="Search the website" placeholder="Search brokers, news, charts, tools…" maxLength={120}/><button type="submit">Search</button></form>}
        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex fx-pro-original-nav">
          {top.map((item) => {
            const kids = children(item.id);
            const active = isActive(item.href);
            if (!kids.length) {
              return (
                <Link key={item.id} href={item.href} onClick={navigate}
                  className={cn("rounded-md px-3 py-1.5 font-condensed text-[16px] font-medium transition-colors",
                    active ? "bg-gold-500 font-semibold text-navy-950" : "text-white hover:text-gold-400")}>
                  {item.label}
                </Link>
              );
            }
            return (
              <div key={item.id} className="relative">
                <button type="button" aria-expanded={menu === item.id} aria-haspopup="true"
                  onClick={() => setMenu(menu === item.id ? null : item.id)}
                  onMouseEnter={() => setMenu(item.id)}
                  className={cn("flex items-center gap-1 rounded-md px-3 py-1.5 font-condensed text-[16px] font-medium transition-colors",
                    active ? "bg-gold-500 font-semibold text-navy-950" : "text-white hover:text-gold-400")}>
                  {item.label}
                  <ChevronDown className="size-4" aria-hidden />
                </button>
                {menu === item.id && (
                  <div onMouseLeave={() => setMenu(null)}
                    className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-gold-500/40 bg-navy-900 py-2 shadow-2xl">
                    {kids.map((k) => (
                      <Link key={k.id} href={k.href} onClick={navigate}
                        className="block px-4 py-2 text-[15px] text-white/90 hover:bg-white/5 hover:text-gold-400">{k.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          <button type="button" aria-label="Search" onClick={() => setSearchOpen((v) => !v)}
            className="grid size-[34px] place-items-center rounded-lg border-[1.5px] border-white/80 text-white hover:border-gold-500 hover:text-gold-400">
            <Search className="size-[18px]" />
          </button>

          {viewer ? (
            <>
              <Link href="/dashboard/notifications" aria-label={`Notifications${viewer.unread ? `, ${viewer.unread} unread` : ""}`}
                className="relative grid size-[34px] place-items-center rounded-lg border-[1.5px] border-white/80 text-white hover:border-gold-500 hover:text-gold-400">
                <Bell className="size-[18px]" />
                {viewer.unread > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-hot px-1 text-[11px] font-bold">
                    {viewer.unread > 99 ? "99+" : viewer.unread}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button type="button" onClick={() => setProfileOpen((v) => !v)} aria-expanded={profileOpen}
                  className="flex items-center gap-2 rounded-lg bg-gold-500 px-2.5 py-1.5 font-condensed font-semibold text-navy-950">
                  <span className="grid size-6 place-items-center rounded-full bg-navy-900 text-xs text-gold-400">
                    {viewer.name.slice(0, 1).toUpperCase() || "U"}
                  </span>
                  <span className="hidden max-w-28 truncate sm:inline">{viewer.name.split(" ")[0] || "Account"}</span>
                  <ChevronDown className="size-4" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gold-500/40 bg-navy-900 py-2 shadow-2xl">
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 hover:bg-white/5"><LayoutDashboard className="size-4" />Dashboard</Link>
                    <Link href="/dashboard/profile" className="flex items-center gap-2 px-4 py-2 hover:bg-white/5"><User className="size-4" />My Profile</Link>
                    {viewer.isStaff && (
                      <Link href="/admin" className="flex items-center gap-2 px-4 py-2 hover:bg-white/5"><Shield className="size-4" />Admin Panel</Link>
                    )}
                    <form action="/auth/signout" method="post">
                      <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-white/5"><LogOut className="size-4" />Logout</button>
                    </form>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="btn-outline h-[34px] px-4 text-[15px]">Login</Link>
              <Link href="/signup" className="btn-gold h-[34px] px-4 text-[15px]">Sign Up</Link>
            </div>
          )}

          <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}
            className="grid size-[34px] place-items-center rounded-lg text-white lg:hidden">
            <Menu className="size-6" />
          </button>
        </div>
      </div>

      {premium && <nav className="fx-pro-nav" aria-label="Main desktop navigation">{[
 {label:"Home",href:"/",links:[]},
 {label:"Brokers",href:"/brokers",links:[["Broker directory","/brokers"],["Compare brokers","/compare-brokers"],["Promotions & bonuses","/broker-promotions"],["License checker","/broker-regulation"],["Broker updates","/broker-updates"],["Regulatory warnings","/broker-warnings"]]},
 {label:"Markets",href:"/market-intelligence",links:[["Market overview","/market-intelligence"],["Prices & charts","/market-quotes"],["Currency strength","/currency-strength"],["Sentiment & COT","/market-sentiment"],["Central banks","/central-banks"],["Macroeconomic data","/macroeconomic-data"]]},
 {label:"News",href:"/news",links:[["All news","/news"],["Trading updates","/trading-updates"],["Broker updates","/broker-updates"]]},
 {label:"Calendar",href:"/economic-calendar",links:[]},
 {label:"Tools",href:"/free-tools",links:[["All tools","/free-tools"],["Trading calculators","/trading-calculators"],["Banner prompts","/free-tools/banner-prompts"],["Video scripts","/free-tools/video-scripts"]]},
 {label:"IB Center",href:"/ib-programs",links:[["IB programs","/ib-programs"],["IB directory","/ib-directory"]]},
 {label:"Community",href:"/community",links:[]}
 ].map(n=>{const active=isActive(n.href)||n.links.some(([,href])=>isActive(href));return <div className="fx-pro-nav-group" key={n.href}><Link href={n.href} onClick={navigate} aria-current={pathname===n.href?"page":undefined} className={active?"fx-pro-nav-active":""}>{n.label}</Link>{n.links.length>0&&<><button type="button" className="fx-pro-nav-toggle" aria-label={n.label+" submenu"} aria-expanded={menu===n.href} onClick={()=>setMenu(menu===n.href?null:n.href)}><ChevronDown size={13}/></button>{menu===n.href&&<div className="fx-pro-dropdown">{n.links.map(([label,href])=><Link key={href} href={href} onClick={navigate}>{label}</Link>)}</div>}</>}</div>})}<Link className="fx-pro-nav-ai" href="/dashboard/studio">AI Studio</Link><details className="fx-pro-more"><summary>More</summary><div className="fx-pro-dropdown"><Link href="/legal" onClick={navigate}>Legal &amp; policies</Link>{top.map(n=><div key={n.id}><Link href={n.href} onClick={navigate}>{n.label}</Link>{children(n.id).map(k=><Link className="fx-pro-sub" key={k.id} href={k.href} onClick={navigate}>{k.label}</Link>)}</div>)}</div></details></nav>}
      {searchOpen && (
        <div className="border-t border-white/10 bg-navy-900">
          <form onSubmit={onSearch} role="search" className="container-site flex gap-2 py-3">
            <label htmlFor="site-search" className="sr-only">Search news</label>
            <input id="site-search" name="q" autoFocus placeholder="Search broker news, markets, prompts…" className="input" maxLength={120} />
            <button className="btn-gold px-5">Search</button>
          </form>
        </div>
      )}

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto border-l border-gold-500/40 bg-navy-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display font-bold text-gold-400">Menu</span>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-1"><X className="size-6" /></button>
            </div>
            <form onSubmit={onSearch} className="mb-4 flex gap-2">
              <input name="q" placeholder="Search…" className="input" aria-label="Search news" />
            </form>
            <nav aria-label="Mobile" className="flex flex-col">
              {top.map((item) => (
                <div key={item.id} className="border-b border-white/10 py-1">
                  <Link href={item.href} onClick={navigate}
                    className={cn("block py-2 font-condensed text-lg", isActive(item.href) ? "text-gold-400" : "text-white")}>{item.label}</Link>
                  {children(item.id).map((k) => (
                    <Link key={k.id} href={k.href} onClick={navigate} className="block py-1.5 pl-4 text-[15px] text-white/75">{k.label}</Link>
                  ))}
                </div>
              ))}
            </nav>
            {!viewer && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link href="/login" onClick={navigate} className="btn-outline h-11">Login</Link>
                <Link href="/signup" onClick={navigate} className="btn-gold h-11">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
