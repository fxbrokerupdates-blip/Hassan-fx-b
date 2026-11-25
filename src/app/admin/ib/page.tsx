import { z } from "zod";
import { redirect } from "next/navigation";
import { requirePermission, assertPermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { audit } from "@/lib/admin/audit";
import Link from "next/link";
const schema=z.object({id:z.string().uuid(),status:z.enum(["approved","rejected","reviewed","closed"]),kind:z.enum(["profile","request"])});
async function moderate(form:FormData){"use server";
 await assertPermission("brokers.manage");
 const parsed=schema.safeParse(Object.fromEntries(form));if(!parsed.success)redirect("/admin/ib?result=invalid");
 const {id,status,kind}=parsed.data;const db=await createSupabaseServer();
 if(kind==="profile"&&status!=="approved"&&status!=="rejected")redirect("/admin/ib?result=invalid");
 if(kind==="request"&&status!=="reviewed"&&status!=="closed")redirect("/admin/ib?result=invalid");
 const table=kind==="profile"?"ib_directory_profiles":"ib_partnership_requests";
 const key=kind==="profile"?"user_id":"id";
 const {data,error}=await db.from(table).update(kind==="profile"?{status,updated_at:new Date().toISOString()}:{status}).eq(key,id).select(key).maybeSingle();
 await audit("moderate",table,id,{status},error||!data?"failure":"success");
 redirect("/admin/ib?result="+(error||!data?"failed":"saved"));
}
function Decision({id,kind,options}:{id:string;kind:string;options:string[]}){return <form action={moderate} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={id}/><input type="hidden" name="kind" value={kind}/><select name="status" className="input" aria-label="Moderation decision">{options.map(o=><option key={o} value={o}>{o}</option>)}</select><button className="btn-outline px-3">Save</button></form>}
export default async function AdminIB({searchParams}:{searchParams:Promise<{result?:string}>}){
 await requirePermission("brokers.manage");const db=await createSupabaseServer();const [profiles,requests,programs]=await Promise.all([db.from("ib_directory_profiles").select("user_id,display_name,region,bio,status").order("updated_at",{ascending:false}).limit(100),db.from("ib_partnership_requests").select("id,program_id,message,status,created_at").order("created_at",{ascending:false}).limit(100),db.from("ib_programs").select("id,title")]);
 const titles=new Map((programs.data??[]).map(p=>[p.id,p.title]));const result=(await searchParams).result;
 return <div className="space-y-6"><h1 className="section-title">IB Moderation</h1><Link href="/ib-programs" className="text-gold-400">Public directory</Link>{result&&<p role="status">{result==="saved"?"Moderation saved.":"Unable to save moderation."}</p>}{(profiles.error||requests.error)&&<p role="alert">Some moderation records could not be loaded.</p>}<section className="space-y-3"><h2 className="font-semibold">Directory applications</h2>{(profiles.data??[]).map(p=><article key={p.user_id} className="card-plain p-4 space-y-2"><h3>{p.display_name} · {p.region} · {p.status}</h3><p className="whitespace-pre-wrap text-sm">{p.bio}</p><Decision id={p.user_id} kind="profile" options={["approved","rejected"]}/></article>)}{!profiles.data?.length&&<p className="text-muted">No profiles.</p>}</section><section className="space-y-3"><h2 className="font-semibold">Private partnership enquiries</h2>{(requests.data??[]).map(r=><article key={r.id} className="card-plain p-4 space-y-2"><h3>{titles.get(r.program_id)??"Program"} · {r.status}</h3><p className="text-xs text-muted">{r.created_at.slice(0,10)}</p><p className="whitespace-pre-wrap text-sm">{r.message}</p><Decision id={r.id} kind="request" options={["reviewed","closed"]}/></article>)}{!requests.data?.length&&<p className="text-muted">No enquiries.</p>}</section></div>;
}
