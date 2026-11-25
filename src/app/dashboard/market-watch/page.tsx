import Link from "next/link";
import {requireUser} from "@/lib/auth";
import {createSupabaseServer} from "@/lib/supabase/server";
import {rateSnapshots,type Rate} from "@/lib/data/market-metrics";
import {MarketTerminal} from "@/components/dashboard/market-terminal";
import {DesktopPartnerCards} from "@/components/home/sections";
import {memberFeatureEnabled} from "@/lib/features";
import {getSiteConfig} from "@/lib/data/site";
export const metadata={title:"Market Watch"};
export default async function Page(){
const viewer=await requireUser("/dashboard/market-watch");const db=await createSupabaseServer();const [rates,watch,config,allowPrompt,allowScript]=await Promise.all([db.from("fx_reference_rates").select("currency,period,units_per_eur").order("period",{ascending:false}).limit(350),db.from("personal_watchlist").select("symbol").eq("user_id",viewer.id),getSiteConfig(),memberFeatureEnabled("banner_prompts"),memberFeatureEnabled("video_scripts")]);
return <div className="fx-member-market space-y-4"><section className="fx-member-hero fx-market-hero"><div><p className="fx-eyebrow">MARKET INTELLIGENCE</p><h1>Market <em>Watch</em></h1><p>Explore daily FX rates, charts and third-party market quotes.</p></div></section>{rates.error&&<p role="alert" className="text-amber-300">Reference data unavailable.</p>}<MarketTerminal snapshots={rateSnapshots((rates.data??[]) as Rate[])} watchlist={(watch.data??[]).map(x=>String(x.symbol))}/>{config.visibility.social_cards&&<DesktopPartnerCards data={config.homepage.social_cards}/>}<div className="fx-member-creators">{allowPrompt&&<Link href="/dashboard/prompts"><div><h2>Daily Free <em>Banner Prompt</em></h2><p>Explore prompt library</p></div></Link>}{allowScript&&<Link href="/dashboard/scripts"><div><h2>Daily Free <em>Video Script</em></h2><p>Explore script library</p></div></Link>}</div><div className="flex flex-wrap gap-2"><Link className="btn-outline px-3 py-2" href="/economic-calendar">Economic calendar</Link><Link className="btn-outline px-3 py-2" href="/market-sentiment">CFTC positioning</Link><Link className="btn-outline px-3 py-2" href="/trading-calculators">Trading calculators</Link></div></div>;
}