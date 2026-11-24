import type { Metadata } from "next";
import { PageHeader } from "@/components/news/page-header";
import { NewsCenter } from "@/components/news/news-center";
import { MARKETS } from "@/lib/defaults";
import { pageMetadata } from "@/lib/seo";
import type { RawParams } from "@/lib/params";

export const metadata: Metadata = pageMetadata({
  title: "Trading Updates — Gold, Forex, Crypto & Market News",
  description: "Financial market news on gold, forex, crypto, central banks, economic data, commodities and global markets.",
  path: "/trading-updates",
});

export default async function TradingUpdatesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Trading" gold="Updates" description="Market-moving news across gold, forex, crypto, central banks and the global economy. Not financial advice."
        crumbs={[{ name: "Home", path: "/" }, { name: "Trading Updates", path: "/trading-updates" }]} />
      <NewsCenter basePath="/trading-updates" sp={sp} base={{ type: "trading" }}
        filters={{ markets: MARKETS.map((m) => ({ value: m.value, label: m.label })), showImpact: true }} />
    </>
  );
}
