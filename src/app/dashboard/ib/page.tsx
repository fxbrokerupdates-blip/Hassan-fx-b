import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
const profileSchema=z.object({display_name:z.string().trim().min(2).max(100),region:z.string().trim().min(2).max(100),bio:z.string().trim().max(1000),consent:z.literal("yes")});
const requestSchema=z.object({program_id:z.string().uuid(),message:z.string().trim().min(10).max(1500)});
async function saveProfile(form:FormData){"use server";
 const viewer=await requireUser("/dashboard/ib");
 if(viewer.profile?.status!=="active"||!viewer.profile.email_verified_at) redirect("/dashboard/ib?result=verify");
 const parsed=profileSchema.safeParse(Object.fromEntries(form));if(!parsed.success)redirect("/dashboard/ib?result=invalid");
 const {consent,...profile}=parsed.data; if(consent!=="yes")redirect("/dashboard/ib?result=invalid");
 const db=await createSupabaseServer();
 const {error}=await db.from("ib_directory_profiles").upsert({...profile,user_id:viewer.id,status:"pending",updated_at:new Date().toISOString()},{onConflict:"user_id"});
 redirect("/dashboard/ib?result="+(error?"failed":"profile"));
}
async function submitRequest(form:FormData){"use server";
 const viewer=await requireUser("/dashboard/ib");
 if(viewer.profile?.status!=="active"||!viewer.profile.email_verified_at)redirect("/dashboard/ib?result=verify");
 const parsed=requestSchema.safeParse(Object.fromEntries(form));if(!parsed.success)redirect("/dashboard/ib?result=invalid");
 const db=await createSupabaseServer();
 const {error}=await db.from("ib_partnership_requests").insert({...parsed.data,user_id:viewer.id,status:"pending"});
 redirect("/dashboard/ib?result="+(error?"failed":"request"));
}
async function removeProfile(){"use server";
 const viewer=await requireUser("/dashboard/ib");
 const db=await createSupabaseServer();const {error}=await db.from("ib_directory_profiles").delete().eq("user_id",viewer.id);
 redirect("/dashboard/ib?result="+(error?"failed":"removed"));
}
const messages:Record<string,string>={profile:"Profile sent for editorial review.",request:"Private request submitted to FX Broker Updates staff. Nothing has been sent to the broker.",removed:"Directory profile removed.",verify:"An active, email-verified account is required.",invalid:"Please check the submitted fields.",failed:"Could not save. A duplicate request or a moderation restriction may apply."};
export default async function MemberIB({searchParams}:{searchParams:Promise<{result?:string}>}){
 const viewer=await requireUser("/dashboard/ib"); const db=await createSupabaseServer();
 const [profile,programs,requests]=await Promise.all([db.from("ib_directory_profiles").select("display_name,region,bio,status").eq("user_id",viewer.id).maybeSingle(),db.from("ib_programs").select("id,title").eq("active",true).order("title"),db.from("ib_partnership_requests").select("id,program_id,status,created_at").eq("user_id",viewer.id).order("created_at",{ascending:false})]);
 const result=(await searchParams).result;const p=profile.data;const titles=new Map((programs.data??[]).map(p=>[p.id,p.title]));
 return <div className="space-y-5"><h1 className="section-title">My IB Center</h1><Link href="/ib-programs" className="text-gold-400">Explore partnership programs</Link>{result&&messages[result]&&<p role="status" className="card-plain p-3">{messages[result]}</p>}
 <section className="card-plain p-4 space-y-3"><h2 className="font-semibold">IB directory profile</h2><p className="text-sm text-muted">Public display name, region and bio will become visible after staff approval. Do not include private contact details. You can remove your listing at any time.</p>{p&&<p className="text-sm">Status: {p.status}</p>}
 {(!p||p.status==="pending")&&<form action={saveProfile} className="space-y-3"><label className="block">Display name<input name="display_name" className="input" minLength={2} maxLength={100} required defaultValue={p?.display_name}/></label><label className="block">Region<input name="region" className="input" minLength={2} maxLength={100} required defaultValue={p?.region}/></label><label className="block">Bio<textarea name="bio" className="input" maxLength={1000} defaultValue={p?.bio??""}/></label><label className="flex gap-2 text-sm"><input type="checkbox" name="consent" value="yes" required/>I consent to publication of these fields if approved.</label><button className="btn-gold px-4">Submit for review</button></form>}{p&&<form action={removeProfile}><button className="btn-outline px-3">Remove my listing</button></form>}</section>
 <section className="card-plain p-4 space-y-3"><h2 className="font-semibold">Partnership enquiry</h2><p className="text-sm text-muted">This is an enquiry to our staff, not an application submitted to a broker. Do not include credentials or financial details.</p><form action={submitRequest} className="space-y-3"><label className="block">Program<select name="program_id" className="input" required><option value="">Select program</option>{(programs.data??[]).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label className="block">Message<textarea name="message" className="input" minLength={10} maxLength={1500} required/></label><button className="btn-gold px-4">Submit private enquiry</button></form></section>
 <section className="card-plain p-4"><h2 className="font-semibold mb-3">My enquiries</h2>{(requests.data??[]).map(r=><div key={r.id} className="border-b border-white/10 py-2 text-sm">{titles.get(r.program_id)??"Program"} · {r.status} · {r.created_at.slice(0,10)}</div>)}{!requests.data?.length&&<p className="text-sm text-muted">No enquiries yet.</p>}</section></div>;
}
