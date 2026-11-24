import type { Metadata } from "next";
import { PageHeader } from "@/components/news/page-header";
import { NewsCenter } from "@/components/news/news-center";
import { getSiteConfig } from "@/lib/data/site";
import { listBrokers } from "@/lib/data/brokers";
import { pageMetadata } from "@/lib/seo";
import type { RawParams } from "@/lib/params";

export const metadata: Metadata = pageMetadata({
  title: "Broker Updates — Global Forex Broker News",
  description: "Broker announcements, promotions, regulatory updates, partnerships, platform news and scam alerts from global Forex brokers.",
  path: "/broker-updates",
});

export default async function BrokerUpdatesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const [config, brokers] = await Promise.all([getSiteConfig(), listBrokers()]);
  const categories = config.categories.filter((c) => c.news_type !== "trading").map((c) => ({ value: c.slug, label: c.name }));
  return (
    <>
      <PageHeader title="Broker" gold="Updates" description="Announcements, promotions, regulatory news and alerts from brokers worldwide. Promotional and regulatory claims are attributed to their original sources."
        crumbs={[{ name: "Home", path: "/" }, { name: "Broker Updates", path: "/broker-updates" }]} />
      <NewsCenter basePath="/broker-updates" sp={sp} base={{ type: "broker" }}
        filters={{ categories, brokers: brokers.map((b) => ({ value: b.slug, label: b.name })) }} />
    </>
  );
}
