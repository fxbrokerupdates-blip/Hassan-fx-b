import Link from "next/link";
import {PageHeader} from "@/components/news/page-header";
import {pageMetadata} from "@/lib/seo";
import {ResearchStats,InfoPanel} from "@/components/layout/research-widgets";
import {listBrokers,listVerifiedLicenseRecords} from "@/lib/data/brokers";
import {createSupabasePublic} from "@/lib/supabase/server";
import {str,type RawParams} from "@/lib/params";
import {BrokerComparison} from "@/components/brokers/comparison";
export const metadata=pageMetadata({title:"Compare Brokers",description:"Compare published broker account information and entity-level license records.",path:"/compare-brokers"});
export default async function Page({searchParams}:{searchParams:Promise<RawParams>}){
const sp=await searchParams;const raw=sp.compare;const selected=[...new Set(Array.isArray(raw)?raw:typeof raw==="string"?[raw]:[])].filter(Boolean).slice(0,3);const [all,licenses]=await Promise.all([listBrokers(),listVerifiedLicenseRecords()]);const brokers=all.filter(b=>!b.is_sample).sort((a,b)=>a.name.localeCompare(b.name));const compared=selected.flatMap(s=>brokers.filter(b=>b.slug===s));
return <><PageHeader title="Compare" gold="Brokers" description="Compare up to three brokers using published entity-specific data, not invented ratings." crumbs={[{name:"Home",path:"/"},{name:"Brokers",path:"/brokers"},{name:"Compare Brokers",path:"/compare-brokers"}]}/><div className="container-site py-8 space-y-5"><ResearchStats items={[{label:"Available profiles",value:brokers.length},{label:"Selected brokers",value:compared.length},{label:"Comparison limit",value:3}]}/><form className="fx-research-filter grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">{[0,1,2].map(i=><label key={i} className="text-xs text-muted">Broker {i+1}<select name="compare" className="input mt-1" defaultValue={selected[i]??""}><option value="">Select broker</option>{brokers.map(b=><option key={b.id} value={b.slug}>{b.name}</option>)}</select></label>)}<button className="btn-gold self-end px-5">Compare</button></form>{compared.length>0?<BrokerComparison compared={compared} licenses={licenses} clearHref="/compare-brokers"/>:<InfoPanel title="Build your comparison"><p>Select brokers above to compare their published platforms, trading costs and entity-level licensing information.</p></InfoPanel>}<Link href="/brokers" className="btn-outline px-4 py-2">Browse broker directory</Link></div></>;
}