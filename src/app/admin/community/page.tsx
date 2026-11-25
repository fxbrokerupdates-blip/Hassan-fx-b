import {redirect} from "next/navigation";
import {z} from "zod";
import {requirePermission,assertPermission} from "@/lib/auth";
import {createSupabaseServer} from "@/lib/supabase/server";
import {audit} from "@/lib/admin/audit";
const URL="/admin/community";
async function moderate(form:FormData){"use server";
 await assertPermission("content_reports.manage");
 const p=z.object({id:z.string().uuid(),kind:z.enum(["post","comment","report"]),status:z.enum(["approved","rejected","reviewed"])}).safeParse(Object.fromEntries(form));if(!p.success)redirect(URL+"?result=invalid");
 const {id,kind,status}=p.data;if((kind==="report")!==(status==="reviewed"))redirect(URL+"?result=invalid");
 const table=kind==="post"?"community_posts":kind==="comment"?"community_comments":"community_post_reports";
 const db=await createSupabaseServer();const {data,error}=await db.from(table).update({status}).eq("id",id).select("id").maybeSingle();await audit("moderate",table,id,{status},error||!data?"failure":"success");redirect(URL+"?result="+(error||!data?"failed":"saved"));
}
function Decision({id,kind}:{id:string;kind:"post"|"comment"|"report"}){return <form action={moderate} className="flex gap-2 flex-wrap"><input type="hidden" name="id" value={id}/><input type="hidden" name="kind" value={kind}/>{(kind==="report"?["reviewed"]:["approved","rejected"]).map(s=><button key={s} name="status" value={s} className="btn-outline px-3 py-1">{s}</button>)}</form>}
export default async function AdminCommunity({searchParams}:{searchParams:Promise<{result?:string}>}){
 await requirePermission("content_reports.manage");const db=await createSupabaseServer();const [posts,comments,reports]=await Promise.all([db.from("community_posts").select("id,title,body,display_name,status").order("created_at",{ascending:false}).limit(100),db.from("community_comments").select("id,post_id,body,display_name,status").order("created_at",{ascending:false}).limit(100),db.from("community_post_reports").select("id,post_id,reason,status").order("created_at",{ascending:false}).limit(100)]);const result=(await searchParams).result;
 return <div className="space-y-5"><h1 className="section-title">Community Moderation</h1>{result&&<p role="status">{result==="saved"?"Decision saved.":"Unable to save decision."}</p>}{(posts.error||comments.error||reports.error)&&<p role="alert">Some records could not be loaded.</p>}<h2 className="font-semibold">Posts</h2>{(posts.data??[]).map(p=><article key={p.id} className="card-plain p-4 space-y-2"><h3>{p.title} · {p.status}</h3><p className="text-xs text-muted">{p.display_name}</p><p className="whitespace-pre-wrap break-words text-sm">{p.body}</p><Decision id={p.id} kind="post"/></article>)}{!posts.data?.length&&<p className="text-muted">No posts.</p>}<h2 className="font-semibold">Comments</h2>{(comments.data??[]).map(c=><article key={c.id} className="card-plain p-4 space-y-2"><p>{c.display_name} · {c.status} · Post {c.post_id}</p><p className="whitespace-pre-wrap break-words">{c.body}</p><Decision id={c.id} kind="comment"/></article>)}{!comments.data?.length&&<p className="text-muted">No comments.</p>}<h2 className="font-semibold">Reports</h2>{(reports.data??[]).map(r=><article key={r.id} className="card-plain p-4 space-y-2"><p>{r.reason} · {r.status} · Post {r.post_id}</p><Decision id={r.id} kind="report"/></article>)}{!reports.data?.length&&<p className="text-muted">No reports.</p>}</div>;
}
