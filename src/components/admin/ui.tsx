import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminHeader({ title, gold, description, actions }: { title: string; gold?: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-[28px]">{title} {gold && <span className="gold-text">{gold}</span>}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-white/70">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  published: "bg-emerald-500/20 text-emerald-300", active: "bg-emerald-500/20 text-emerald-300", approved: "bg-emerald-500/20 text-emerald-300",
  verified: "bg-emerald-500/20 text-emerald-300", subscribed: "bg-emerald-500/20 text-emerald-300", resolved: "bg-emerald-500/20 text-emerald-300",
  completed: "bg-emerald-500/20 text-emerald-300", success: "bg-emerald-500/20 text-emerald-300", sent: "bg-emerald-500/20 text-emerald-300",
  draft: "bg-white/10 text-white/80", pending: "bg-amber-500/20 text-amber-200", pending_review: "bg-amber-500/20 text-amber-200",
  scheduled: "bg-sky-500/20 text-sky-200", new: "bg-sky-500/20 text-sky-200", open: "bg-sky-500/20 text-sky-200", in_progress: "bg-sky-500/20 text-sky-200",
  archived: "bg-white/5 text-white/50", rejected: "bg-red-500/20 text-red-300", suspended: "bg-red-500/20 text-red-300", failed: "bg-red-500/20 text-red-300",
  hot: "bg-hot text-white", warm: "bg-orange-500/80 text-white", unsubscribed: "bg-white/5 text-white/50",
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted">—</span>;
  return <span className={cn("inline-block rounded px-2 py-0.5 text-[11px] font-semibold capitalize", BADGE[value] ?? "bg-white/10 text-white/80")}>{value.replace(/_/g, " ")}</span>;
}

export function Tabs({ tabs, current }: { tabs: { href: string; label: string; key: string }[]; current: string }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-white/10">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={cn("-mb-px border-b-2 px-3 py-2 text-sm", current === t.key ? "border-gold-500 font-semibold text-gold-400" : "border-transparent text-white/70 hover:text-white")}>{t.label}</Link>
      ))}
    </div>
  );
}

export function KPI({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "gold" | "green" | "red" }) {
  return (
    <div className="card-plain p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={cn("mt-1.5 font-display text-2xl font-bold", tone === "gold" && "gold-text", tone === "green" && "text-emerald-400", tone === "red" && "text-red-400")}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("card-plain p-5", className)}>
      {(title || actions) && <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-display text-base font-bold">{title}</h2>{actions}</div>}
      {children}
    </section>
  );
}

export function EstimateNote() {
  return <p className="text-xs text-muted">Presence, session duration and engaged time are <strong>estimates</strong> based on heartbeats from visible, recently-active browser tabs.</p>;
}
