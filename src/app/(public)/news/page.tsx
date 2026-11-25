import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/news/page-header";
import { NewsCenter } from "@/components/news/news-center";
import { getSiteConfig } from "@/lib/data/site";
import { pageMetadata } from "@/lib/seo";
import { oneOf, str, type RawParams } from "@/lib/params";
import type { NewsQuery } from "@/lib/data/news";
import { cn } from "@/lib/utils";
import { MARKETS } from "@/lib/defaults";

export const metadata: Metadata = pageMetadata({
  title: "All News — Broker & Trading Updates",
  description: "Every broker announcement and trading market update in one place: latest, trending, featured and archives.",
  path: "/news",
});

const TABS = [
  { key: "all", label: "All News" }, { key: "broker", label: "Broker News" }, { key: "trading", label: "Trading News" },
  { key: "trending", label: "Trending" }, { key: "latest", label: "Latest" }, { key: "featured", label: "Featured" },
] as const;

function lastMonths(n: number) {
  const out: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push({ value: m.toISOString().slice(0, 7), label: m.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) });
  }
  return out;
}

export default async function AllNewsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const tab = oneOf(sp, "tab", TABS.map((t) => t.key)) ?? "all";
  const month = str(sp, "month", 7);
  const config = await getSiteConfig();
  const base: NewsQuery = {};
  if (tab === "broker" || tab === "trading") base.type = tab;
  if (tab === "trending") base.trending = true;
  if (tab === "featured") base.featured = true;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    base.from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    base.to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  }
  return (
    <>
      <PageHeader title="All" gold="News Updates" description="Broker news and trading market updates in one unified feed."
        crumbs={[{ name: "Home", path: "/" }, { name: "All News", path: "/news" }]} />
      <div className="container-site mt-6 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === "all" ? "/news" : `/news?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}
            className={cn("rounded-full px-4 py-1.5 font-condensed text-[15px] font-semibold ring-1",
              tab === t.key ? "bg-gold-500 text-navy-950 ring-gold-500" : "text-white/85 ring-white/15 hover:text-gold-400")}>{t.label}</Link>
        ))}
        <details className="relative ml-auto">
          <summary className="cursor-pointer list-none rounded-full px-4 py-1.5 text-sm ring-1 ring-white/15">Archives ▾</summary>
          <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-white/10 bg-navy-900 p-2 shadow-xl">
            {lastMonths(12).map((m) => (
              <Link key={m.value} href={`/news?month=${m.value}`} className="block rounded px-3 py-1.5 text-sm hover:bg-white/5">{m.label}</Link>
            ))}
          </div>
        </details>
      </div>
      <NewsCenter basePath="/news" sp={sp} base={base} showFeatured={tab === "all"}
        filters={{ showType: tab === "all", categories: config.categories.map((c) => ({ value: c.slug, label: c.name })), markets: tab==="broker"?undefined:MARKETS.map(m=>({value:m.value,label:m.label})),showImpact:tab!=="broker" }} />
    </>
  );
}
