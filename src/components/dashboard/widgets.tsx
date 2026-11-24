import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Panel({ title, gold, href, hrefLabel = "View all", children, className }: {
  title: string; gold?: string; href?: string; hrefLabel?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("card-plain p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">{title} {gold && <span className="gold-text">{gold}</span>}</h2>
        {href && <Link href={href} className="flex items-center gap-1 text-sm text-white/70 hover:text-gold-400">{hrefLabel}<ArrowRight className="size-4" /></Link>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-white/60">{children}</p>;
}

export function Stat({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="card-plain p-4">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">{label}{icon}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
