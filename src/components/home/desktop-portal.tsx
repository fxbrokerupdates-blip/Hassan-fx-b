import Link from "next/link";
import Image from "next/image";
import {ArrowRight, BarChart3, CalendarDays, Calculator, ChevronRight, Globe, Landmark, Newspaper, Shield, Sparkles, Users, Zap} from "lucide-react";
import {createSupabasePublic} from "@/lib/supabase/server";
import {listBrokers,listVerifiedLicenseRecords} from "@/lib/data/brokers";
import {rateSnapshots,crossRate,crossChange,cotSnapshots,positioning,type Rate,type Cot} from "@/lib/data/market-metrics";
import {events} from "@/lib/data/economic-events";
import type {Article} from "@/types/db";
import type {HomepageContent} from "@/lib/defaults";
const tools=[
 {title:"Economic Calendar",href:"/economic-calendar",Icon:CalendarDays},
 {title:"Market Quotes",href:"/market-quotes",Icon:BarChart3},
 {title:"Trading Calculator",href:"/trading-calculators",Icon:Calculator},
 {title:"Currency Strength",href:"/currency-strength",Icon:Zap},
 {title:"Macro Intelligence",href:"/market-intelligence",Icon:Globe},
 {title:"COT Data",href:"/market-sentiment",Icon:BarChart3},
 {title:"IB Programs",href:"/ib-programs",Icon:Users},
 {title:"AI Studio",href:"/dashboard/studio",Icon:Sparkles}
];
const pairs=[["EUR","USD"],["GBP","USD"],["USD","JPY"],["AUD","USD"],["USD","CAD"],["USD","CHF"],["NZD","USD"]];
const signed=(v:number|null)=>v===null?"—":(v>=0?"+":"")+v.toFixed(2)+"%";
const trend=(v:number|null)=>v===null?"":v>=0?"fx-up":"fx-down";
const fmt=(v:number|null,d=5)=>v===null?"—":v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const date=(v:string|null|undefined)=>v?new Date(v).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}):"";
function PanelTitle({title,href,Icon}:{title:string;href:string;Icon:typeof Newspaper}){return <div className="fx-pro-title"><Icon size={18}/><h2>{title}</h2><Link href={href}>View all <ArrowRight size={12}/></Link></div>}
export async function DesktopPortal({hero,articles,showHero,showNews}:{hero:HomepageContent["hero"];articles:Article[];showHero:boolean;showNews:boolean}){
 const db=createSupabasePublic();
 const [rateResult,cotResult,allBrokers,licenses]=await Promise.all([
 db?db.from("fx_reference_rates").select("currency,period,units_per_eur").order("period",{ascending:false}).limit(350):Promise.resolve({data:[]}),
 db?db.from("cot_currency_positions").select("currency,period,open_interest,asset_long,asset_short,leveraged_long,leveraged_short").order("period",{ascending:false}).limit(100):Promise.resolve({data:[]}),
 listBrokers(),listVerifiedLicenseRecords()]);
 const snapshots=rateSnapshots((rateResult.data??[]) as Rate[]);const [current,previous]=snapshots;
 const rates=pairs.map(([base,quote])=>({symbol:base+"/"+quote,value:current?crossRate(current,base,quote):null,change:current&&previous?crossChange(current,previous,base,quote):null,digits:quote==="JPY"?3:5}));
 const brokers=allBrokers.filter(b=>!b.is_sample);const checked=new Set(licenses.map(r=>r.broker_id));const selected=brokers.filter(b=>checked.has(b.id)).sort((a,b)=>Number(b.is_featured)-Number(a.is_featured)||a.name.localeCompare(b.name)).slice(0,5);
 const cot=cotSnapshots((cotResult.data??[]) as Cot[])[0];
 const series=snapshots.slice(0,20).reverse().map(s=>crossRate(s,"EUR","USD")).filter((v):v is number=>v!==null);
 const min=series.length?Math.min(...series):0,max=series.length?Math.max(...series):0,span=max-min||1;
 const points=series.map((v,i)=>[12+i*276/Math.max(1,series.length-1),100-(v-min)/span*78]);
 const d=points.map((p,i)=>(i?"L":"M")+p.join(" ")).join(" ");
 const first=points[0],last=points.at(-1);
 const upcoming=events.filter(e=>e.utc?Date.parse(e.utc)>=Date.now():e.date>=new Date().toISOString().slice(0,10)).slice(0,5);
 const news=articles.filter(a=>!a.is_sample).sort((a,b)=>(b.original_published_at??b.published_at??"").localeCompare(a.original_published_at??a.published_at??"")).slice(0,5);
 return <div className="fx-pro-home">
 <div className="fx-pro-ticker"><div className="fx-pro-ticker-label"><span className="fx-pro-dot"/>FX REFERENCE<small>ECB · {current?.period??"Unavailable"}</small></div>{rates.slice(0,5).map(r=><Link href="/market-quotes" key={r.symbol} className="fx-pro-tick"><b>{r.symbol}</b><div><strong>{fmt(r.value,r.digits)}</strong><span className={trend(r.change)}>{signed(r.change)}</span></div></Link>)}<Link href="/market-quotes" className="fx-pro-tick fx-pro-all">Gold · Crypto · Indices <ChevronRight size={16}/></Link></div>
 <div className="fx-pro-content">
 <div className="fx-pro-topgrid">
 {showHero?<section className="fx-pro-hero"><div className="fx-pro-hero-image"><Image src={hero.image_url||"/images/hero-markets.webp"} alt="" fill sizes="650px" priority className="object-cover"/></div><div className="fx-pro-hero-copy"><p>GLOBAL MARKET INTELLIGENCE</p><h1>Forex, Gold, Crypto &amp;<br/><em>Broker Updates</em></h1><div>Market news, broker research and advanced trading tools — one intelligent destination.</div><div className="fx-pro-actions"><Link className="fx-pro-primary" href="/brokers">Explore Brokers <ArrowRight size={16}/></Link><Link className="fx-pro-secondary" href="/market-intelligence">Market Overview</Link></div></div></section>:<section className="fx-pro-panel fx-pro-hero"><h1>Market Intelligence</h1><Link href="/market-intelligence">Explore markets</Link></section>}
 <section className="fx-pro-panel fx-pro-chart"><PanelTitle title="Market overview" href="/market-quotes" Icon={BarChart3}/><div className="fx-pro-chart-copy"><div><span>EUR/USD · ECB reference</span><strong>{fmt(rates[0]?.value??null)}</strong></div><b className={trend(rates[0]?.change??null)}>{signed(rates[0]?.change??null)}</b></div>{series.length>=2?<svg viewBox="0 0 300 110" role="img" aria-label="EUR/USD daily ECB reference history"><defs><linearGradient id="fx-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#30cfa0" stopOpacity=".25"/><stop offset="100%" stopColor="#30cfa0" stopOpacity="0"/></linearGradient></defs>{[22,48,74,100].map(y=><line key={y} x1="12" x2="288" y1={y} y2={y} stroke="#22384b" strokeDasharray="3 5"/>)}{first&&last&&<path d={d+" L"+last[0]+" 107 L"+first[0]+" 107 Z"} fill="url(#fx-chart-fill)"/>}<path d={d} stroke="#39d5a0" strokeWidth="2" fill="none" strokeLinejoin="round"/></svg>:<div className="fx-pro-empty">Daily chart unavailable</div>}<div className="fx-pro-chart-footer"><span>{series.length} daily observations</span><Link href="/market-quotes">Gold &amp; live-provider charts →</Link></div></section>
 <section className="fx-pro-panel"><PanelTitle title="Economic calendar" href="/economic-calendar" Icon={CalendarDays}/><div className="fx-pro-calendar-head"><span>Date (UTC)</span><span>Event</span><span>Impact</span></div>{upcoming.map(e=><Link href="/economic-calendar" className="fx-pro-calendar-row" key={e.date+e.name}><span>{date(e.date+"T00:00:00Z").slice(0,6)}<small>{e.utc?e.utc.slice(11,16):"TBC"}</small></span><span><b>{e.currency}</b> {e.name}</span><span className={e.impact==="High"?"fx-impact-high":"fx-impact-medium"} aria-label={e.impact+" impact"}>▮▮▮</span></Link>)}{!upcoming.length&&<p className="fx-pro-empty">No upcoming events in the saved calendar.</p>}<div className="fx-pro-note">Official schedule snapshot · times may change</div></section>
 </div>
 <nav className="fx-pro-tools" aria-label="Quick market tools">{tools.map(({title,href,Icon})=><Link key={href} href={href}><Icon size={25} strokeWidth={1.9}/><span>{title}</span></Link>)}</nav>
 <div className={"fx-pro-bottomgrid"+(!showNews?" fx-pro-no-news":"")}>
 {showNews&&<section className="fx-pro-panel"><PanelTitle title="Latest market news" href="/news" Icon={Newspaper}/><nav className="fx-pro-news-tabs" aria-label="News categories"><Link href="/news">All</Link><Link href="/trading-updates">Trading</Link><Link href="/broker-updates">Broker</Link><Link href="/news?market=gold">Gold</Link><Link href="/news?market=crypto">Crypto</Link></nav>{news.map((n,i)=><Link href={"/news/"+n.slug} className="fx-pro-news-row" key={n.id}><div className="fx-pro-thumb">{n.featured_image_url?<Image src={n.featured_image_url} alt="" fill sizes="100px" className="object-cover"/>:<Newspaper size={22}/>}</div><div><b>{n.title}</b><small>{date(n.original_published_at??n.published_at)} · {n.source_name??"Market news"}</small></div>{n.priority==="hot"&&<span className="fx-pro-hot">HOT</span>}{i===0&&<span className="sr-only">Latest source report</span>}</Link>)}{!news.length&&<p className="fx-pro-empty">No published news yet.</p>}</section>}
 <section className="fx-pro-panel"><PanelTitle title="Broker directory" href="/brokers" Icon={Landmark}/><div className="fx-pro-broker-count"><strong>{brokers.length}</strong><span>Broker profiles<br/><small>{brokers.filter(b=>checked.has(b.id)).length} with recorded licence checks</small></span></div>{selected.map(b=><Link href={"/brokers/"+b.slug} className="fx-pro-broker-row" key={b.id}><span className="fx-pro-monogram">{b.name.slice(0,2).toUpperCase()}</span><div><b>{b.name}</b><small>{licenses.find(r=>r.broker_id===b.id)?.jurisdiction??"Entity record"}</small></div><ChevronRight size={16}/></Link>)}<p className="fx-pro-note">Research listings, not rankings or endorsements.</p></section>
 <section className="fx-pro-panel"><PanelTitle title="Market sentiment" href="/market-sentiment" Icon={BarChart3}/><p className="fx-pro-note">CFTC · Asset managers · {cot?.period??"Unavailable"}</p>{cot?.rows.slice(0,5).map(r=>{const p=positioning(r.asset_long,r.asset_short);const v=p?.longPercent;return <div className="fx-pro-sentiment" key={r.currency}><div><b>{r.currency}</b><span>{v==null?"—":v.toFixed(1)+"% long"}</span></div>{v!=null&&<div className="fx-pro-bar"><div style={{width:v+"%"}}/></div>}</div>})}{!cot&&<p className="fx-pro-empty">No complete COT report available.</p>}<p className="fx-pro-note">Weekly futures positioning, not live retail sentiment.</p></section>
 <div className="fx-pro-aside"><section className="fx-pro-promo"><Users size={22}/><h2>IB Programs</h2><p>Explore partner programs and compare published terms.</p><Link className="fx-pro-primary" href="/ib-programs">Explore IB <ArrowRight size={14}/></Link></section><section className="fx-pro-promo"><Shield size={22}/><h2>Broker Comparison</h2><p>Research fees, platforms and entity-specific licences.</p><Link className="fx-pro-secondary" href="/compare-brokers">Compare brokers <ArrowRight size={14}/></Link></section></div>
 </div>
 <div className="fx-pro-footer-tools">{[{title:"Market data",sub:"Reference rates & charts",href:"/market-quotes",Icon:Zap},{title:"Broker research",sub:"Entity licence records",href:"/broker-regulation",Icon:Shield},{title:"Trading tools",sub:"Risk & position sizing",href:"/free-tools",Icon:Calculator},{title:"AI Creator Studio",sub:"News to content",href:"/dashboard/studio",Icon:Sparkles},{title:"Trader community",sub:"Discuss & learn",href:"/community",Icon:Users},{title:"IB intelligence",sub:"Partner programs",href:"/ib-programs",Icon:Landmark}].map(({title,sub,href,Icon})=><Link href={href} key={href}><Icon size={22}/><div><b>{title}</b><small>{sub}</small></div></Link>)}</div>
 </div></div>;
}
