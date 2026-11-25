import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/news/page-header";
import { pageMetadata } from "@/lib/seo";
import { createSupabasePublic } from "@/lib/supabase/server";
import {cotSnapshots,positioning,COT_CURRENCIES,type Cot} from "@/lib/data/market-metrics";
export const metadata:Metadata=pageMetadata({title:"Market Sentiment & Institutional Positioning",description:"CFTC weekly asset manager and leveraged fund long-short positioning.",path:"/market-sentiment"});
export const revalidate=300;
const num=(n:number|null)=>n===null?"—":n.toLocaleString("en-US",{maximumFractionDigits:0});
const signed=(n:number|null)=>n===null?"—":(n>0?"+":"")+num(n);
const cls=(n:number|null)=>n===null||n===0?"text-muted":n>0?"text-emerald-300":"text-red-300";
type Position=ReturnType<typeof positioning>;
function PositionCell({value,prior}:{value:Position;prior:Position}){const delta=value&&prior?value.net-prior.net:null;return <div className="space-y-1 min-w-36"><div className="flex items-center justify-between text-xs"><span className="text-emerald-300">{value?.longPercent==null?"—":value.longPercent.toFixed(1)+"% long"}</span><span className="text-red-300">{value?.longPercent==null?"—":(100-value.longPercent).toFixed(1)+"% short"}</span></div>{value?.longPercent!=null&&<div className="h-2 rounded bg-red-500/60 overflow-hidden" aria-hidden="true"><div className="h-full bg-emerald-500" style={{width:value.longPercent+"%"}}/></div>}<p className={"text-sm tabular-nums "+cls(value?.net??null)}>Net: {signed(value?.net??null)}</p><p className={"text-xs tabular-nums "+cls(delta)}>Change: {signed(delta)}</p></div>}
export default async function MarketSentiment(){
 const db=createSupabasePublic();const result=db?await db.from("cot_currency_positions").select("currency,period,open_interest,asset_long,asset_short,leveraged_long,leveraged_short").order("period",{ascending:false}).limit(100):{data:[],error:null};const [current,previous]=cotSnapshots((result.data??[]) as Cot[]);
 return <><PageHeader title="Market" gold="Sentiment" description="Weekly institutional currency futures positioning from CFTC Commitments of Traders reports." crumbs={[{name:"Home",path:"/"},{name:"Market Sentiment",path:"/market-sentiment"}]}/><div className="container-site py-8 space-y-5">
 <div className="flex flex-wrap gap-2"><Link href="/currency-strength" className="btn-gold px-4 py-2">Currency Strength</Link><Link href="/market-intelligence" className="btn-outline px-4 py-2">Market Intelligence</Link></div>
 <section className="card-plain p-4"><h2 className="section-title">Institutional positioning</h2><p className="text-sm text-muted mt-2">Report date: {current?.period??"Unavailable"} · comparison: {previous?.period??"Unavailable"}.</p><p className="text-xs text-muted mt-2">Long/short percentages use directional contracts only, excluding spreading positions. Net and change are contract counts. Asset managers and leveraged funds are separate groups; this is neither retail broker sentiment nor a live market signal.</p></section>
 {(!db||result.error||!current)&&<p role="status" className="text-amber-300">No complete positioning report available.</p>}
 {current&&<section className="card-plain overflow-x-auto"><table className="table-clean min-w-[680px]"><thead><tr><th>Currency</th><th>Open interest</th><th>Asset managers</th><th>Leveraged funds</th></tr></thead><tbody>{COT_CURRENCIES.map(currency=>{const a=current.rows.find(r=>r.currency===currency),b=previous?.rows.find(r=>r.currency===currency);if(!a)return null;return <tr key={currency}><th>{currency}</th><td className="tabular-nums">{num(Number(a.open_interest))}</td><td><PositionCell value={positioning(a.asset_long,a.asset_short)} prior={positioning(b?.asset_long,b?.asset_short)}/></td><td><PositionCell value={positioning(a.leveraged_long,a.leveraged_short)} prior={positioning(b?.leveraged_long,b?.leveraged_short)}/></td></tr>})}</tbody></table></section>}
 <p className="text-xs text-muted">Source: <a className="text-gold-400" href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" rel="noopener noreferrer">CFTC Commitments of Traders</a>. Futures positioning is reported periodically and may be delayed. USD index, gold and crypto positioning are not included in this dataset.</p></div></>;
}
