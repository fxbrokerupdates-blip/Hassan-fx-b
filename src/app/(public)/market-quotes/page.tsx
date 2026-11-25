import Link from "next/link";
import {PageHeader} from "@/components/news/page-header";
import {pageMetadata} from "@/lib/seo";
import {MarketOverviewWidget} from "@/components/trading/market-overview-widget";
export const metadata=pageMetadata({title:"Market Quotes & Charts",description:"View available third-party forex, gold, crypto and index quotes with source attribution.",path:"/market-quotes"});
export default function MarketQuotes(){return <><PageHeader title="Market" gold="Quotes" description="Explore market quotes and charts from a third-party data provider." crumbs={[{name:"Home",path:"/"},{name:"Market Quotes",path:"/market-quotes"}]}/><div className="container-site py-8 space-y-4"><div className="flex flex-wrap gap-2">{[["/market-intelligence","Market Intelligence"],["/currency-strength","Currency Strength"],["/market-sentiment","Market Sentiment"],["/economic-calendar","Economic Calendar"]].map(([href,label])=><Link key={href} href={href} className="btn-outline px-3 py-2">{label}</Link>)}</div><MarketOverviewWidget/></div></>;}
