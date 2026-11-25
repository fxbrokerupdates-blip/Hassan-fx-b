import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/news/page-header";
import { NewsCard } from "@/components/news/news-card";
import { listNews } from "@/lib/data/news";
import { getSiteConfig } from "@/lib/data/site";
import { listBrokers } from "@/lib/data/brokers";
import { str, pageNum, flatParams, type RawParams } from "@/lib/params";
import { Pagination } from "@/components/news/pagination";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const q = str(sp, "q", 120);
  const page = pageNum(sp);
  const [news, brokers] = q ? await Promise.all([listNews({ q, page, pageSize: 12 }), listBrokers(q)]) : [null, []];
  const config = await getSiteConfig();
  const destinations = [
    {href:"/market-quotes",label:"Market Quotes & Charts",keywords:"forex gold crypto indices commodities xauusd eurusd gbpusd usdjpy btcusd price chart tradingview silver oil"},
    {href:"/economic-calendar",label:"Economic Calendar",keywords:"cpi nfp fomc gdp events releases"},
    {href:"/trading-calculators",label:"Trading Calculators",keywords:"lot pip margin risk reward calculator"},
    {href:"/currency-strength",label:"Currency Strength",keywords:"heatmap ecb fx"},
    {href:"/market-sentiment",label:"Market Sentiment",keywords:"cot commitment traders"},
    {href:"/broker-regulation",label:"Broker License Checker",keywords:"regulation licence regulated fca asic cysec"},
    {href:"/compare-brokers",label:"Compare Brokers",keywords:"broker comparison spreads leverage"},
    {href:"/broker-promotions",label:"Broker Promotions",keywords:"bonuses offers"},
    {href:"/ib-programs",label:"IB Programs",keywords:"affiliate partner rebate commission"},
    {href:"/dashboard/trader",label:"Trader Workspace",keywords:"journal trading plan watchlist alerts"},
    ...(config.flags.banner_prompts?[{href:"/free-tools/banner-prompts",label:"Daily Banner Prompts",keywords:"ai image social poster"}]:[]),
    ...(config.flags.video_scripts?[{href:"/free-tools/video-scripts",label:"Daily Video Scripts",keywords:"video reels youtube"}]:[]),
    ...(config.flags.ai_studio?[{href:"/dashboard/studio",label:"AI Creator Studio",keywords:"ai create article video content"}]:[]),
  ];
  const terms=(q??"").toLowerCase().split(/\s+/).filter(Boolean);
  const matchingTools=q?destinations.filter(item=>terms.every(term=>(item.label+" "+item.keywords).toLowerCase().includes(term))):[];
  return (
    <>
      <PageHeader title="Search" gold="Results" description={q ? `Results for “${q}”` : "Search broker news, market updates and brokers."}
        crumbs={[{ name: "Home", path: "/" }, { name: "Search", path: "/search" }]} />
      <div className="container-site py-8 fx-search-page">
        <form action="/search" className="flex gap-2 fx-research-filter" role="search">
          <input name="q" defaultValue={q} className="input" placeholder="Search…" aria-label="Search" maxLength={120} />
          <button className="btn-gold px-6">Search</button>
        </form>
        {q && (
          <>
            {matchingTools.length>0&&<section className="hidden lg:block mt-6" aria-label="Matching market tools"><h2 className="section-title mb-3">Markets &amp; Tools ({matchingTools.length})</h2><div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{matchingTools.map(tool=><Link key={tool.href} href={tool.href} className="fx-market-card"><span><strong>{tool.label}</strong><small>Open workspace</small></span><span aria-hidden="true" className="fx-arrow">›</span></Link>)}</div></section>}
            {brokers.length > 0 && (
              <section className="mt-8">
                <h2 className="section-title mb-3">Brokers</h2>
                <div className="flex flex-wrap gap-2">
                  {brokers.slice(0, 12).map((b) => (
                    <Link key={b.id} href={`/brokers/${b.slug}`} className="rounded-full px-4 py-1.5 ring-1 ring-white/15 hover:text-gold-400">{b.name}</Link>
                  ))}
                </div>
              </section>
            )}
            <section className="mt-8">
              <h2 className="section-title mb-3">News ({news?.total ?? 0})</h2>
              {news && news.items.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 fx-news-feed">{news.items.map((a) => <NewsCard key={a.id} a={a} />)}</div>
              ) : <p className="text-white/70">No news found.</p>}
              {news && <Pagination page={news.page} total={news.total} pageSize={news.pageSize} basePath="/search" params={flatParams(sp)} />}
            </section>
          </>
        )}
      </div>
    </>
  );
}
