import Link from "next/link";
import { CategoryCards, DailyTools, Hero, NewsBar, SocialCards, UpdatesPanel } from "@/components/home/sections";
import { AdSlot } from "@/components/ads/ad-slot";
import { getSiteConfig } from "@/lib/data/site";
import { getHomeNews } from "@/lib/data/news";
import { JsonLd, organizationJsonLd } from "@/lib/seo";

export const revalidate = 60;

export default async function HomePage() {
  const config = await getSiteConfig();
  const { homepage: h, visibility: v } = config;
  const per = Math.min(Math.max(Number(h.todays_updates.items_per_panel) || 3, 1), 6);
  const news = v.todays_updates ? await getHomeNews(per) : { broker: [], trading: [], isSample: false };
  return (
    <>
      <JsonLd data={organizationJsonLd(config)} />
      {v.hero && <Hero data={h.hero} />}
      {v.social_cards && <SocialCards data={h.social_cards} />}
      {v.daily_tools && <DailyTools data={h.daily_tools} />}
      {v.news_bar && <NewsBar data={h.news_bar} />}
      <section className="container-site mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-3" aria-label="Intelligence tools">{[{href:"/market-quotes",title:"Market Quotes",desc:"Forex, gold, crypto and indices"},{href:"/market-intelligence",title:"Market Intelligence",desc:"Central banks, FX reference rates and COT positioning"},{href:"/economic-calendar",title:"Economic Calendar",desc:"Official schedules and timezone filters"},{href:"/ib-programs",title:"IB Intelligence",desc:"Compare partnership programs"},{href:"/currency-strength",title:"Currency Strength",desc:"Eight currencies and FX heatmap"},{href:"/market-sentiment",title:"Market Sentiment",desc:"Institutional weekly positioning"}].map(x=><Link key={x.href} href={x.href} className="card-plain p-4 hover:border-gold-400"><h2 className="font-semibold text-gold-400">{x.title}</h2><p className="mt-1 text-xs text-muted">{x.desc}</p></Link>)}</section>
      {v.todays_updates && (
        <div className="container-site mt-[14px] grid gap-4 lg:grid-cols-2 lg:gap-[18px]">
          <UpdatesPanel kind="broker" plain={h.todays_updates.broker_title_plain} gold={h.todays_updates.broker_title_gold} items={news.broker} perPanel={per} />
          <UpdatesPanel kind="trading" plain={h.todays_updates.trading_title_plain} gold={h.todays_updates.trading_title_gold} items={news.trading} perPanel={per} />
        </div>
      )}
      {v.categories && <CategoryCards categories={config.categories} />}
      {v.advertisement && config.flags.advertisements && <AdSlot placement="home_banner" className="container-site mt-6" />}
    </>
  );
}
