import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/news/page-header";
import { pageMetadata } from "@/lib/seo";
import { createSupabasePublic } from "@/lib/supabase/server";
import { CURRENCIES,rateSnapshots,crossRate,crossChange,currencyStrength,type Rate } from "@/lib/data/market-metrics";
export const metadata:Metadata=pageMetadata({title:"Currency Strength Meter & FX Heatmap",description:"Daily reference-rate currency strength and bilateral exchange rate changes.",path:"/currency-strength"});
export const dynamic="force-dynamic";
const percent=(n:number|null)=>n===null?"—":(n>0?"+":"")+n.toFixed(2)+"%";
const tone=(n:number|null)=>n===null||Math.abs(n)<.005?"text-muted":n>0?"text-emerald-300":"text-red-300";
const heat=(n:number|null)=>n===null||Math.abs(n)<.005?"bg-white/5":n>0?"bg-emerald-500/15":"bg-red-500/15";
const pairs=["EUR/USD","GBP/USD","USD/JPY","USD/CHF","USD/CAD","AUD/USD","NZD/USD","EUR/GBP","GBP/JPY","EUR/JPY"];
export default async function CurrencyStrength({searchParams}:{searchParams:Promise<{period?:string}>}){
 const params=await searchParams;const period=params.period==="5"?5:params.period==="20"?20:1;
 const db=createSupabasePublic();const result=db?await db.from("fx_reference_rates").select("currency,period,units_per_eur").order("period",{ascending:false}).limit(350):{data:[],error:null};
 const snapshots=rateSnapshots((result.data??[]) as Rate[]);
 const current=snapshots[0],previous=snapshots[period];
 const strengths=current&&previous?currencyStrength(current,previous):[];
 const max=Math.max(.01,...strengths.map(x=>Math.abs(x.strength??0)));
 return <><PageHeader title="Currency" gold="Strength Meter" description="Compare eight major currencies using a consistent daily reference-rate basket." crumbs={[{name:"Home",path:"/"},{name:"Currency Strength",path:"/currency-strength"}]}/><div className="container-site py-8 space-y-6">
 <div className="flex flex-wrap gap-2"><Link className="btn-outline px-4 py-2" href="/market-intelligence">Market Intelligence</Link><Link className="btn-outline px-4 py-2" href="/market-sentiment">Market Sentiment</Link></div>
 <section className="card-plain p-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="section-title">Relative currency performance</h2><nav aria-label="Observation period" className="flex gap-2">{[1,5,20].map(n=><Link key={n} href={"/currency-strength?period="+n} aria-current={n===period?"page":undefined} className={n===period?"btn-gold px-3 py-2":"btn-outline px-3 py-2"}>{n}D</Link>)}</nav></div>
 <p className="text-xs text-muted">ECB reference rates · {current?.period??"Unavailable"} vs {previous?.period??"Unavailable"} · {period} published observation intervals, not calendar days.</p>
 {(!db||result.error||!previous)&&<p role="status" className="text-amber-300 text-sm">Insufficient complete observations. No estimated or synthetic rates are substituted.</p>}
 {strengths.map((x,i)=><div key={x.currency} className="grid grid-cols-[2rem_3rem_1fr_5rem] gap-2 items-center"><span className="text-xs text-muted">{i+1}</span><strong>{x.currency}</strong><div className="relative h-3 rounded bg-white/5 overflow-hidden" aria-hidden="true"><div className="absolute left-1/2 top-0 h-full w-px bg-white/30"/><div className={"absolute top-0 h-full rounded "+((x.strength??0)>=0?"bg-emerald-500":"bg-red-500")} style={{width:Math.abs(x.strength??0)/max*50+"%",left:(x.strength??0)>=0?"50%":50-Math.abs(x.strength??0)/max*50+"%"}}/></div><span className={"text-right tabular-nums font-semibold "+tone(x.strength)}>{percent(x.strength)}</span></div>)}
 <p className="text-xs text-muted">Method: geometric mean of each currency's change against the other seven, equally weighted. Positive means appreciation against the basket; it is not a trading recommendation or a live intraday indicator.</p></section>
 {current&&previous&&<><section className="space-y-3"><h2 className="section-title">FX performance heatmap</h2><p className="text-xs text-muted">Rows are base currencies; columns are quote currencies. Values are percentage changes over the selected interval.</p><div className="card-plain overflow-x-auto"><table className="table-clean min-w-[650px]"><thead><tr><th>Base / quote</th>{CURRENCIES.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{CURRENCIES.map(base=><tr key={base}><th>{base}</th>{CURRENCIES.map(quote=>{const change=base===quote?null:crossChange(current,previous,base,quote);return <td key={quote} className={heat(change)+" "+tone(change)+" text-center tabular-nums"}>{percent(change)}</td>})}</tr>)}</tbody></table></div></section>
 <section className="space-y-3"><h2 className="section-title">Major FX pairs</h2><div className="grid grid-cols-2 md:grid-cols-5 gap-3">{pairs.map(pair=>{const [base,quote]=pair.split("/");const rate=crossRate(current,base,quote),change=crossChange(current,previous,base,quote);return <article key={pair} className="card-plain p-3"><h3 className="text-sm font-semibold">{pair}</h3><p className="text-lg tabular-nums">{rate===null?"—":rate.toFixed(quote==="JPY"?3:5)}</p><p className={"text-xs "+tone(change)}>{percent(change)}</p></article>})}</div></section></>}
 <p className="text-xs text-muted">Source: <a className="text-gold-400" href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" target="_blank" rel="noopener noreferrer">ECB euro foreign exchange reference rates</a>. Calculated crosses are reference values, not executable quotes, and exclude bid/ask spreads.</p></div></>;
}
