"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function BrokerReviewForm({brokerId}:{brokerId:string}) {
 const router=useRouter();
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [sent,setSent]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>) {
 e.preventDefault(); if(busy||sent)return;
 const form=new FormData(e.currentTarget);setBusy(true);setMessage("");
 try {
 const response=await fetch("/api/brokers/reviews",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({broker_id:brokerId,rating:Number(form.get("rating")),title:form.get("title"),body:form.get("body")})});
 if(response.status===401){router.push("/login?next="+encodeURIComponent(location.pathname));return;}
 const result=await response.json();
 if(!response.ok){setMessage(result.error??"Review could not be submitted.");return;}
 setSent(true);setMessage("Review submitted. It will appear only after moderation.");
 }catch{setMessage("Connection failed. Please try again.");}finally{setBusy(false);}
 }
 return <section className="card-plain p-4 space-y-3"><h3 className="font-semibold">Share your experience</h3><p className="text-xs text-muted">Only first-hand experiences. Do not include personal information or unverifiable accusations. Reviews are moderated.</p>{!sent&&<form onSubmit={submit} className="space-y-3"><label className="block text-sm">Rating<select name="rating" className="input mt-1" defaultValue="5">{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label><label className="block text-sm">Title<input name="title" minLength={5} maxLength={160} required className="input mt-1"/></label><label className="block text-sm">Review<textarea name="body" minLength={30} maxLength={3000} rows={4} required className="input mt-1"/></label><button className="btn-gold px-4" disabled={busy}>{busy?"Submitting…":"Submit for review"}</button></form>}<p role="status" className="text-sm">{message}</p></section>;
}
