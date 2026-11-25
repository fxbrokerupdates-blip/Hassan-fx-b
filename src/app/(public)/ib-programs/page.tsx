import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/news/page-header";
import { pageMetadata } from "@/lib/seo";
import { createSupabasePublic } from "@/lib/supabase/server";
import { listBrokers } from "@/lib/data/brokers";
import { str, type RawParams } from "@/lib/params";

export const metadata: Metadata = pageMetadata({title:"IB Intelligence Center",description:"Research and compare published introducing broker and affiliate programs.",path:"/ib-programs"});
type Program = {id:string;broker_id:string;program_kind:string;title:string;description:string;official_url:string;commission_basis:string;region_note:string;source_checked_at:string};
const kinds:Record<string,string>={ib:"Introducing broker",affiliate:"Affiliate",hybrid:"Hybrid"};
const bases:Record<string,string>={volume:"Trading activity / volume",cpa:"CPA",varies:"Varies by agreement",not_confirmed:"Not confirmed"};
export default async function IBProgramsPage({searchParams}:{searchParams:Promise<RawParams>}) {
 const sp=await searchParams;
 const q=str(sp,"q",80)?.toLowerCase() ?? "";
 const kind=str(sp,"kind",20);
 const db=createSupabasePublic();
 const [brokers,result]=await Promise.all([listBrokers(),db ? db.from("ib_programs").select("id,broker_id,program_kind,title,description,official_url,commission_basis,region_note,source_checked_at").eq("active",true).order("title").limit(500) : Promise.resolve({data:[]})]);
 const directory=db ? await db.from("ib_directory_profiles").select("display_name,region,bio").eq("status","approved").order("display_name").limit(100) : {data:[]};
 const names=new Map(brokers.filter(b=>!b.is_sample).map(b=>[b.id,b]));
 const rows=((result.data??[]) as Program[]).filter(p=>names.has(p.broker_id));
 const filtered=rows.filter(p=>(!kind || p.program_kind===kind)&&(!q || (p.title+" "+names.get(p.broker_id)?.name).toLowerCase().includes(q)));
 const raw=sp.compare;
 const selected=[...new Set(Array.isArray(raw)?raw:typeof raw==="string"?[raw]:[])].slice(0,3);
 const comparison=selected.flatMap(id=>rows.filter(p=>p.id===id));
 return <><PageHeader title="IB" gold="Intelligence" description="Compare partnership models and published terms. No guaranteed earnings or endorsements." crumbs={[{name:"Home",path:"/"},{name:"IB Programs",path:"/ib-programs"}]}/>
 <div className="container-site py-8 space-y-5">
 <Link href="/dashboard/ib" className="btn-outline inline-flex px-4 py-2">My IB Center</Link>
 <p className="card-plain p-4 text-sm text-white/75">{rows.length} programs listed. Always check local authorization, financial-promotion restrictions, qualifying activity, payout rules and contract terms. This directory does not transmit applications to brokers.</p>
 <form role="search" className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]"><input name="q" defaultValue={q} className="input" placeholder="Search broker or program" aria-label="Search program"/><select name="kind" defaultValue={kind??""} className="input" aria-label="Program type"><option value="">All programs</option>{Object.entries(kinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><button className="btn-gold px-4">Filter</button></form>
 {comparison.length>0&&<section className="card-plain overflow-x-auto p-4"><h2 className="section-title mb-3">Program comparison</h2><table className="table-clean"><thead><tr><th>Feature</th>{comparison.map(p=><th key={p.id}>{p.title}</th>)}</tr></thead><tbody><tr><th>Program</th>{comparison.map(p=><td key={p.id}>{kinds[p.program_kind]??p.program_kind}</td>)}</tr><tr><th>Commission model</th>{comparison.map(p=><td key={p.id}>{bases[p.commission_basis]??"Not confirmed"}</td>)}</tr><tr><th>Eligibility</th>{comparison.map(p=><td key={p.id}>{p.region_note}</td>)}</tr><tr><th>Official terms</th>{comparison.map(p=><td key={p.id}><a href={p.official_url} className="text-gold-400" target="_blank" rel="noopener noreferrer nofollow">Read terms</a></td>)}</tr></tbody></table></section>}
 <form><input type="hidden" name="q" value={q}/><input type="hidden" name="kind" value={kind??""}/><div className="flex items-center justify-between mb-4"><p className="text-sm text-muted">{filtered.length} results · Select up to 3</p><button className="btn-gold px-4">Compare</button></div>
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{filtered.map(p=><article key={p.id} className="card-plain p-4 space-y-3"><Link href={`/brokers/${names.get(p.broker_id)?.slug}`} className="text-xs text-gold-400">{names.get(p.broker_id)?.name}</Link><h2 className="font-semibold text-lg">{p.title}</h2><p className="text-sm">{kinds[p.program_kind]} · {bases[p.commission_basis]}</p><p className="text-sm text-white/75">{p.description}</p><p className="text-xs text-muted">{p.region_note} Source recorded {p.source_checked_at?.slice(0,10)}.</p><div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"><label className="text-sm flex gap-2"><input type="checkbox" name="compare" value={p.id} defaultChecked={selected.includes(p.id)}/>Compare</label><a href={p.official_url} className="text-sm text-gold-400" target="_blank" rel="noopener noreferrer nofollow">Official details</a></div></article>)}</div>
 {!filtered.length&&<p className="p-5 text-muted">No matching programs.</p>}</form><section className="space-y-3"><h2 className="section-title">IB Community Directory</h2><p className="text-sm text-muted">Editorial approval is not professional licensing or an endorsement. No private contact details are displayed.</p><div className="grid gap-3 sm:grid-cols-2">{(directory.data??[]).map((p,i)=><article key={i} className="card-plain p-4"><h3 className="font-semibold">{p.display_name}</h3><p className="text-xs text-muted">{p.region}</p><p className="mt-2 text-sm">{p.bio}</p></article>)}</div>{!directory.data?.length&&<p className="text-sm text-muted">No approved member listings yet.</p>}</section></div></>;
}
