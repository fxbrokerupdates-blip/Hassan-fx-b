import Link from "next/link";
import { ChevronRight, Globe, Landmark, Newspaper, CalendarDays, BarChart3, Calculator, ShieldCheck, Users, Search, BookOpen, Mail, Sparkles } from "lucide-react";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";

export function PageHeader({ title, gold, description, crumbs }: {
  title: string; gold?: string; description?: string; crumbs: { name: string; path: string }[];
}) {
  const path=crumbs.at(-1)?.path??"/";
  const Icon=path.includes("regulation")||path.includes("warnings")?ShieldCheck:path.includes("broker")?Landmark:path.includes("calendar")?CalendarDays:path.includes("news")||path.includes("updates")||path.includes("category")?Newspaper:path.includes("currency")||path.includes("market")||path.includes("macro")?BarChart3:path.includes("central-banks")?Landmark:path.includes("calculator")?Calculator:path.includes("free-tools")?Sparkles:path.includes("community")||path.includes("ib-")?Users:path.includes("search")?Search:path.includes("contact")||path.includes("newsletter")?Mail:path.includes("legal")||path.includes("privacy")||path.includes("terms")||path.includes("disclaimer")?BookOpen:Globe;
  return (
    <section className="fx-page-heading border-b border-white/10 bg-[radial-gradient(ellipse_at_top_left,#0d2c52,var(--deep-navy)_60%)]">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <div className="container-site py-4 sm:py-5">
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted">
          {crumbs.map((c, i) => (
            <span key={c.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3" />}
              {i < crumbs.length - 1 ? <Link href={c.path} className="hover:text-gold-400">{c.name}</Link> : <span aria-current="page">{c.name}</span>}
            </span>
          ))}
        </nav>
        <div className="fx-heading-row"><div className="fx-heading-icon" aria-hidden="true"><Icon size={25} strokeWidth={1.7}/></div><div className="fx-heading-copy"><h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title} {gold && <span className="gold-text">{gold}</span>}</h1>
        {description && <p className="mt-2 max-w-3xl text-white/80">{description}</p>}</div></div>
      </div>
    </section>
  );
}
