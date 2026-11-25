import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { getSiteConfig } from "@/lib/data/site";
import { createSupabaseServer } from "@/lib/supabase/server";
import { error, json, parseBody, sameOrigin } from "@/lib/security/http";

const Body = z.object({broker_id:z.string().uuid(),rating:z.number().int().min(1).max(5),title:z.string().trim().min(5).max(160),body:z.string().trim().min(30).max(3000)});
export async function POST(req:Request) {
 if(!sameOrigin(req)) return error("Forbidden",403);
 const viewer=await getViewer();
 if(!viewer) return error("Please log in",401);
 if(viewer.profile?.status!=="active" || !viewer.profile.email_verified_at) return error("Active verified account required",403);
 const config=await getSiteConfig();
 if(!config.flags.user_reviews) return error("Review submissions are temporarily disabled",403);
 const {data,error:err}=await parseBody(req,Body,16000);
 if(!data) return error(err??"Invalid review");
 const db=await createSupabaseServer();
 const {data:broker}=await db.from("brokers").select("id").eq("id",data.broker_id).eq("status","active").eq("is_sample",false).maybeSingle();
 if(!broker) return error("Broker not available",404);
 const {data:existing,error:lookup}=await db.from("broker_reviews").select("id").eq("broker_id",data.broker_id).eq("user_id",viewer.id).in("status",["pending","approved"]).limit(1);
 if(lookup) return error("Unable to check existing reviews",500);
 if(existing?.length) return error("You already have a submitted review for this broker",409);
 const {error:failure}=await db.from("broker_reviews").insert({...data,user_id:viewer.id,review_type:"user",status:"pending"});
 if(failure) return error("Could not submit review",500);
 return json({ok:true,status:"pending"},201);
}
