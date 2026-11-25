import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";

export function PageHeader({ title, gold, description, crumbs }: {
  title: string; gold?: string; description?: string; crumbs: { name: string; path: string }[];
}) {
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
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title} {gold && <span className="gold-text">{gold}</span>}</h1>
        {description && <p className="mt-2 max-w-3xl text-white/80">{description}</p>}
      </div>
    </section>
  );
}
