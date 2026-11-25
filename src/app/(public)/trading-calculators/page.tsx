import {ResearchNav,ResearchStats,InfoPanel} from "@/components/layout/research-widgets";
import { PageHeader } from "@/components/news/page-header";
import { TradingCalculator } from "@/components/trading/trading-calculator";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
export const metadata=pageMetadata({title:"Trading Calculators",description:"Free position size, pip value, risk, margin and reward-to-risk estimates.",path:"/trading-calculators"});
export default function TradingCalculators(){return <><PageHeader title="Trading" gold="Calculators" description="Calculate risk and position size before a trade. No login needed." crumbs={[{name:"Home",path:"/"},{name:"Trading Calculators",path:"/trading-calculators"}]}/><div className="container-site py-8 space-y-4 fx-research-page"><ResearchNav active="/trading-calculators"/><Link href="/dashboard/trader" className="btn-outline px-4 py-2">My trading workspace</Link><TradingCalculator/><InfoPanel title="Before placing a trade" href="/dashboard/trader" label="Open trading workspace"><p>Confirm contract specifications, stop distance and total exposure. Record a trading plan before entry.</p></InfoPanel></div></>;}
