import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/news/page-header";
import { NewsCard } from "@/components/news/news-card";
import { listNews } from "@/lib/data/news";
import { listBrokers } from "@/lib/data/brokers";
import { str, pageNum, flatParams, type RawParams } from "@/lib/params";
import { Pagination } from "@/components/news/pagination";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const q = str(sp, "q", 120);
  const page = pageNum(sp);
  const [news, brokers] = q ? await Promise.all([listNews({ q, page, pageSize: 12 }), listBrokers(q)]) : [null, []];
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
