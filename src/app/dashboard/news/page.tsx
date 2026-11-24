import { NewsCenter } from "@/components/news/news-center";
import { getSiteConfig } from "@/lib/data/site";
import { listBrokers } from "@/lib/data/brokers";
import { MARKETS } from "@/lib/defaults";
import { oneOf, type RawParams } from "@/lib/params";

export const metadata = { title: "News" };

export default async function DashboardNews({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const type = oneOf(sp, "type", ["broker", "trading", "all"] as const) ?? "all";
  const [config, brokers] = await Promise.all([getSiteConfig(), listBrokers()]);
  const title = type === "broker" ? "Broker Updates" : type === "trading" ? "Trading Updates" : "All News";
  return (
    <div className="-mx-4 lg:-mx-8">
      <h2 className="px-4 font-display text-2xl font-bold lg:px-8">{title}</h2>
      <NewsCenter basePath="/dashboard/news" sp={sp} base={{ type }}
        filters={{
          categories: type !== "trading" ? config.categories.filter((c) => c.news_type !== "trading").map((c) => ({ value: c.slug, label: c.name })) : undefined,
          markets: type !== "broker" ? MARKETS.map((m) => ({ value: m.value, label: m.label })) : undefined,
          brokers: type !== "trading" ? brokers.map((b) => ({ value: b.slug, label: b.name })) : undefined,
          showImpact: type === "trading",
        }} />
    </div>
  );
}
