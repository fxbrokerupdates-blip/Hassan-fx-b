import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/news/page-header";
import { NewsCenter } from "@/components/news/news-center";
import { getSiteConfig } from "@/lib/data/site";
import { listBrokers } from "@/lib/data/brokers";
import { pageMetadata } from "@/lib/seo";
import type { RawParams } from "@/lib/params";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = (await getSiteConfig()).categories.find((c) => c.slug === slug);
  if (!cat) return { title: "Category not found" };
  return pageMetadata({ title: `${cat.name} — News Archive`, description: cat.home_description ?? cat.description ?? `${cat.name} news on FX Broker Updates.`, path: `/category/${slug}` });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const config = await getSiteConfig();
  const cat = config.categories.find((c) => c.slug === slug);
  if (!cat) notFound();
  const brokers = cat.news_type !== "trading" ? await listBrokers() : [];
  return (
    <>
      <PageHeader title={cat.name} description={cat.home_description ?? cat.description ?? undefined}
        crumbs={[{ name: "Home", path: "/" }, { name: "News", path: "/news" }, { name: cat.name, path: `/category/${slug}` }]} />
      {slug === "scam-alerts" && (
        <div className="container-site mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Scam and fraud alerts are reviewed by our editors before publication and attributed to official sources (regulators, courts or the affected company). Always verify with the relevant regulator.
        </div>
      )}
      <NewsCenter basePath={`/category/${slug}`} sp={sp} base={{ category: slug }}
        filters={{ brokers: brokers.map((b) => ({ value: b.slug, label: b.name })) }} />
    </>
  );
}
