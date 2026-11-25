import Link from "next/link";
import {DesktopPortal} from "@/components/home/desktop-portal";
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
      <DesktopPortal hero={h.hero} articles={[...news.trading,...news.broker]} showHero={v.hero} showNews={v.todays_updates}/>
      <div className="fx-home-extras">{v.news_bar&&<NewsBar data={h.news_bar}/>}{v.daily_tools&&<DailyTools data={{cards:h.daily_tools.cards.filter(c=>c.key==="banner"?config.flags.banner_prompts:c.key==="video"?config.flags.video_scripts:true)}}/>}{v.social_cards&&<SocialCards data={{cards:h.social_cards.cards.filter(c=>!/^https:\/\/example\.com(?:\/|$)/i.test(c.href)&&!/^https:\/\/www\.(?:facebook|linkedin)\.com\/?$/i.test(c.href))}}/>}{v.categories&&<CategoryCards categories={config.categories}/>}</div>
      <div className="fx-legacy-home">
      {v.hero && <Hero data={h.hero} />}
      <section className="container-site mt-4" aria-label="Market tools"><div className="fx-section-heading"><h2>Market tools</h2><Link href="/free-tools">All tools →</Link></div><div className="fx-market-grid">{[{href:"/market-quotes",title:"Market Quotes",desc:"Forex, gold & crypto"},{href:"/economic-calendar",title:"Economic Calendar",desc:"Upcoming releases"},{href:"/currency-strength",title:"Currency Strength",desc:"FX heatmap"},{href:"/market-sentiment",title:"Market Sentiment",desc:"COT positioning"},{href:"/market-intelligence",title:"Market Intelligence",desc:"Macro & central banks"},{href:"/trading-calculators",title:"Calculators",desc:"Risk & position size"},{href:"/brokers",title:"Broker Directory",desc:"Compare brokers"},{href:"/ib-programs",title:"IB Intelligence",desc:"Partnership programs"}].map((x,i)=><Link key={x.href} href={x.href} className="fx-market-card"><span className="fx-tool-index">{String(i+1).padStart(2,"0")}</span><span className="min-w-0"><strong>{x.title}</strong><small>{x.desc}</small></span><span aria-hidden="true" className="fx-arrow">›</span></Link>)}</div></section>
      {v.news_bar && <NewsBar data={h.news_bar} />}
      {v.todays_updates && (
        <div className="container-site mt-3 grid gap-3 lg:grid-cols-2">
          <UpdatesPanel kind="broker" plain={h.todays_updates.broker_title_plain} gold={h.todays_updates.broker_title_gold} items={news.broker} perPanel={per} />
          <UpdatesPanel kind="trading" plain={h.todays_updates.trading_title_plain} gold={h.todays_updates.trading_title_gold} items={news.trading} perPanel={per} />
        </div>
      )}
      <section className="container-site mt-4 grid gap-3 sm:grid-cols-2"><Link href="/community" className="fx-market-card"><span><strong>Trader Community</strong><small>Moderated market discussions</small></span><span className="fx-arrow">›</span></Link><Link href="/dashboard/trader" className="fx-market-card"><span><strong>My Trader Workspace</strong><small>Journal, watchlist & trading plan</small></span><span className="fx-arrow">›</span></Link></section>
      {v.daily_tools && <DailyTools data={h.daily_tools} />}
      {v.social_cards && <SocialCards data={h.social_cards} />}
      {v.categories && <CategoryCards categories={config.categories} />}
      </div>
      {v.advertisement && config.flags.advertisements && <AdSlot placement="home_banner" className="container-site mt-6" />}
    </>
  );
}
