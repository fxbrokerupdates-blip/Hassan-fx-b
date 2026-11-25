import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/news/page-header";
import { pageMetadata } from "@/lib/seo";
import { str,type RawParams } from "@/lib/params";
export const metadata:Metadata=pageMetadata({title:"Economic Calendar",description:"Selected scheduled economic releases and central bank meetings with official sources.",path:"/economic-calendar"});
export const dynamic="force-dynamic";
type Event={date:string;utc:string|null;currency:string;name:string;provider:string;url:string;impact:"High"|"Medium"};
const bls="https://www.bls.gov/schedule/2026/12_sched_list.htm",bea="https://www.bea.gov/news/schedule",fed="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",ecb="https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html";
const events:Event[]=[
 {date:"2026-11-25",utc:"2026-11-25T13:30:00Z",currency:"USD",name:"GDP — Q3 second estimate",provider:"BEA",url:bea,impact:"High"},
 {date:"2026-11-25",utc:"2026-11-25T13:30:00Z",currency:"USD",name:"Personal income and outlays — October",provider:"BEA",url:bea,impact:"High"},
 {date:"2026-12-01",utc:"2026-12-01T15:00:00Z",currency:"USD",name:"JOLTS — October",provider:"BLS",url:bls,impact:"High"},
 {date:"2026-12-04",utc:"2026-12-04T13:30:00Z",currency:"USD",name:"Employment situation — November (NFP)",provider:"BLS",url:bls,impact:"High"},
 {date:"2026-12-08",utc:"2026-12-08T13:30:00Z",currency:"USD",name:"Productivity and costs — Q3 revision",provider:"BLS",url:bls,impact:"Medium"},
 {date:"2026-12-08",utc:"2026-12-08T13:30:00Z",currency:"USD",name:"International trade — October",provider:"BEA",url:bea,impact:"Medium"},
 {date:"2026-12-09",utc:null,currency:"USD",name:"FOMC policy meeting — final day",provider:"Federal Reserve",url:fed,impact:"High"},
 {date:"2026-12-10",utc:"2026-12-10T13:30:00Z",currency:"USD",name:"CPI — November",provider:"BLS",url:bls,impact:"High"},
 {date:"2026-12-15",utc:"2026-12-15T13:30:00Z",currency:"USD",name:"PPI — November",provider:"BLS",url:bls,impact:"High"},
 {date:"2026-12-17",utc:null,currency:"EUR",name:"ECB monetary policy meeting — final day",provider:"ECB",url:ecb,impact:"High"},
 {date:"2026-12-17",utc:"2026-12-17T13:30:00Z",currency:"USD",name:"Import and export prices — November",provider:"BLS",url:bls,impact:"Medium"},
 {date:"2026-12-23",utc:"2026-12-23T13:30:00Z",currency:"USD",name:"GDP — Q3 third estimate",provider:"BEA",url:bea,impact:"High"},
 {date:"2026-12-23",utc:"2026-12-23T13:30:00Z",currency:"USD",name:"Personal income and outlays — November",provider:"BEA",url:bea,impact:"High"},
];
const zones:Record<string,string>={UTC:"UTC","Asia/Karachi":"Pakistan (PKT)","Asia/Kuala_Lumpur":"Malaysia (MYT)","America/New_York":"New York"};
export default async function EconomicCalendar({searchParams}:{searchParams:Promise<RawParams>}){
 const sp=await searchParams;const requested=str(sp,"tz",40)??"UTC";const tz=Object.hasOwn(zones,requested)?requested:"UTC";const currency=str(sp,"currency",3);const impact=str(sp,"impact",10);const range=str(sp,"range",10)??"upcoming";
 const now=new Date();const today=now.toISOString().slice(0,10);
 const rows=events.filter(e=>(!currency||currency===e.currency)&&(!impact||impact===e.impact)&&(range==="all"||(e.utc?Date.parse(e.utc)>=now.getTime():e.date>=today)));
 const dt=new Intl.DateTimeFormat("en-GB",{timeZone:tz,day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
 return <><PageHeader title="Economic" gold="Calendar" description="Selected official release schedules. Times and dates may change; forecasts and actuals are not yet connected." crumbs={[{name:"Home",path:"/"},{name:"Economic Calendar",path:"/economic-calendar"}]}/><div className="container-site py-8 space-y-5">
 <div className="flex flex-wrap gap-3"><Link href="/market-intelligence" className="btn-outline px-4 py-2">Market Intelligence</Link><a href="https://www.bls.gov/schedule/news_release/bls.ics" className="btn-outline px-4 py-2">BLS calendar subscription</a></div>
 <p className="card-plain p-4 text-sm text-muted">Manual official schedule snapshot checked 25 November 2026. Impact is an editorial importance estimate, not a forecast. Meeting-only dates use the official local calendar date; no unverified time is assumed.</p>
 <form className="grid gap-2 sm:grid-cols-5"><select name="range" defaultValue={range} className="input" aria-label="Date range"><option value="upcoming">Upcoming</option><option value="all">All snapshot events</option></select><select name="currency" defaultValue={currency??""} className="input" aria-label="Currency"><option value="">All currencies</option><option>USD</option><option>EUR</option></select><select name="impact" defaultValue={impact??""} className="input" aria-label="Impact"><option value="">All impact</option><option>High</option><option>Medium</option></select><select name="tz" defaultValue={tz} className="input" aria-label="Time zone">{Object.entries(zones).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select><button className="btn-gold px-4">Apply</button></form>
 <div className="card-plain overflow-x-auto"><table className="table-clean"><thead><tr><th>Date / time ({zones[tz]})</th><th>Currency</th><th>Impact</th><th>Event</th><th>Actual</th><th>Forecast</th><th>Previous</th><th>Official source</th></tr></thead><tbody>{rows.map(e=><tr key={e.date+e.name}><td className="whitespace-nowrap">{e.utc?dt.format(new Date(e.utc)):e.date+" · time not recorded"}</td><td>{e.currency}</td><td className={e.impact==="High"?"text-amber-300":"text-muted"}>{e.impact}</td><td>{e.name}</td><td>—</td><td>—</td><td>—</td><td><a href={e.url} target="_blank" rel="noopener noreferrer" className="text-gold-400">{e.provider}</a></td></tr>)}</tbody></table>{!rows.length&&<p className="p-4 text-muted">No events in this snapshot match your filters. Check official calendars for new releases.</p>}</div>
 <p className="text-xs text-muted">This is not a complete live global economic calendar. <a href={bls} className="text-gold-400">BLS</a> · <a href={bea} className="text-gold-400">BEA</a> · <a href={fed} className="text-gold-400">Fed</a> · <a href={ecb} className="text-gold-400">ECB</a></p></div></>;
}
