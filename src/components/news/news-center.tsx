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
    from: dateParam(sp, "from"),
    to: dateParam(sp, "to"),
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
    <div className="container-site py-8">
      <TrackOnMount event="news_list_view" metadata={{ list: basePath }} />
      <Suspense fallback={<div className="skeleton h-32" />}>
        <NewsFilters {...filters} />
      </Suspense>
      {result.error && <p role="alert" className="mt-6 rounded-lg bg-red-500/10 p-4 text-red-300">{result.error}</p>}
      {feature && <div className="mt-6"><NewsCard a={feature} variant="featured" /></div>}
      <div className="mt-6 flex items-center justify-between text-sm text-muted">
        <span>{result.total.toLocaleString()} {result.total === 1 ? "article" : "articles"} · latest first</span>
      </div>
      {items.length === 0 && !result.error ? (
        <div className="mt-6 rounded-xl border border-dashed border-white/15 p-12 text-center text-white/70">
          No articles match these filters yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a, i) => (
            <div key={a.id} className={i === 6 ? "contents" : undefined}>
              <NewsCard a={a} />
            </div>
          ))}
        </div>
      )}
      <AdSlot placement="news_listing" className="mt-8" />
      <Pagination page={result.page} total={result.total} pageSize={result.pageSize} basePath={basePath} params={flatParams(sp)} />
    </div>
  );
}
