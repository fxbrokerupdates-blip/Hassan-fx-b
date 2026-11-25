import Link from "next/link";
import { Newspaper, CalendarDays, BarChart3, ShieldCheck, ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { NewsCard } from "@/components/news/news-card";
import { NewsFilters, type FilterOption } from "@/components/news/news-filters";
import { Pagination } from "@/components/news/pagination";
import { AdSlot } from "@/components/ads/ad-slot";
import { listNews, type NewsQuery } from "@/lib/data/news";
import { dateParam, flatParams, oneOf, pageNum, str, type RawParams } from "@/lib/params";
import { TrackOnMount } from "@/components/analytics/track-on-mount";

export async function NewsCenter({ basePath, sp, base, filters, showFeatured = true }: {
  basePath: string; sp: RawParams; base: NewsQuery;
  filters: { categories?: FilterOption[]; brokers?: FilterOption[]; markets?: FilterOption[]; showType?: boolean; showImpact?: boolean };
  showFeatured?: boolean;
}) {
  const query: NewsQuery = {
    ...base,
    type: base.type ?? oneOf(sp, "type", ["broker", "trading"] as const) ?? "all",
    category: base.category ?? str(sp, "category", 80),
    market: base.market ?? str(sp, "market", 40),
    broker: str(sp, "broker", 80),
    priority: oneOf(sp, "priority", ["hot", "warm", "normal"] as const),
    impact: oneOf(sp, "impact", ["high", "medium", "low"] as const),
    source: str(sp, "source", 60),
    country: str(sp, "country", 2),
    q: str(sp, "q", 120),
    from: dateParam(sp, "from") ?? base.from,
    to: dateParam(sp, "to") ?? base.to,
    page: pageNum(sp),
    pageSize: 12,
  };
  const filtered = Object.keys(sp).some((k) => k !== "page");
  const [result, featured] = await Promise.all([
    listNews(query),
    showFeatured && !filtered && query.page === 1 ? listNews({ ...base, type: query.type, featured: true, pageSize: 1 }) : null,
  ]);
  const feature = featured?.items[0];
  const items = feature ? result.items.filter((i) => i.id !== feature.id) : result.items;

  return (
    <div className="container-site py-8 fx-newsroom">
      <TrackOnMount event="news_list_view" metadata={{ list: basePath }} />
      <Suspense fallback={<div className="skeleton h-32" />}>
        <NewsFilters {...filters} />
      </Suspense>
      <div className="fx-news-workspace"><div className="fx-news-main">
      {result.error && <p role="alert" className="mt-6 rounded-lg bg-red-500/10 p-4 text-red-300">{result.error}</p>}
      {feature && <div className="mt-6"><NewsCard a={feature} variant="featured" /></div>}
      <div className="mt-6 flex items-center justify-between text-sm text-muted">
        <span><strong className="fx-news-count">{result.total.toLocaleString()}</strong> {result.total === 1 ? "article" : "articles"} · latest first</span>
      </div>
      {items.length === 0 && !result.error ? (
        <div className="mt-6 rounded-xl border border-dashed border-white/15 p-12 text-center text-white/70">
          No articles match these filters yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 fx-news-feed">
          {items.map((a, i) => (
            <div key={a.id} className={i === 6 ? "contents" : undefined}>
              <NewsCard a={a} />
            </div>
          ))}
        </div>
      )}
      <AdSlot placement="news_listing" className="mt-8" />
      <Pagination page={result.page} total={result.total} pageSize={result.pageSize} basePath={basePath} params={flatParams(sp)} />
      </div><aside className="fx-news-rail"><section className="card-plain fx-rail-panel"><h2><Newspaper size={17}/> News desk</h2>{[{label:"All news",href:"/news"},{label:"Trading news",href:"/trading-updates"},{label:"Broker updates",href:"/broker-updates"}].map(x=><Link key={x.href} href={x.href} aria-current={basePath===x.href?"page":undefined}>{x.label}<ArrowRight size={13}/></Link>)}</section><section className="card-plain fx-rail-panel"><h2><BarChart3 size={17}/> Research tools</h2>{[{label:"Market overview",href:"/market-intelligence",Icon:BarChart3},{label:"Economic calendar",href:"/economic-calendar",Icon:CalendarDays},{label:"License checker",href:"/broker-regulation",Icon:ShieldCheck}].map(({label,href,Icon})=><Link key={href} href={href}><span><Icon size={14}/>{label}</span><ArrowRight size={13}/></Link>)}</section></aside></div>
    </div>
  );
}
