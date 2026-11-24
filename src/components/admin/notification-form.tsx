"use client";
import { useActionState, useState } from "react";
import { createNotificationAction, type AdminState } from "@/app/admin/actions";

export function NotificationForm({ segments, brokers, markets, defaultSegment }: {
  segments: { id: string; name: string }[]; brokers: { id: string; name: string }[]; markets: { value: string; label: string }[]; defaultSegment?: string;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(createNotificationAction, {});
  const [aud, setAud] = useState(defaultSegment ? "segment" : "all");
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2"><label className="label" htmlFor="title">Title</label><input id="title" name="title" required maxLength={160} className="input" /></div>
      <div className="md:col-span-2"><label className="label" htmlFor="body">Message</label><textarea id="body" name="body" maxLength={1000} className="input min-h-20" /></div>
      <div><label className="label" htmlFor="link">Link (internal path)</label><input id="link" name="link" placeholder="/news/…" className="input" /></div>
      <div><label className="label" htmlFor="category">Category</label>
        <select id="category" name="category" className="input">
          <option value="announcement">Platform announcement</option><option value="breaking_broker">Breaking broker news</option><option value="trading">Important trading news</option>
          <option value="new_prompt">New banner prompt</option><option value="new_script">New video script</option><option value="followed_broker">Followed broker update</option><option value="account">Account notice</option>
        </select></div>
      <div><label className="label" htmlFor="audience">Audience</label>
        <select id="audience" name="audience" value={aud} onChange={(e) => setAud(e.target.value)} className="input">
          <option value="all">All eligible members</option><option value="segment">User segment</option><option value="broker_followers">Followers of a broker</option><option value="market">Members interested in a market</option>
        </select></div>
      {aud === "segment" && <div><label className="label" htmlFor="segment_id">Segment</label><select id="segment_id" name="segment_id" defaultValue={defaultSegment} className="input">{segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
      {aud === "broker_followers" && <div><label className="label" htmlFor="broker_id">Broker</label><select id="broker_id" name="broker_id" className="input">{brokers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
      {aud === "market" && <div><label className="label" htmlFor="market">Market</label><select id="market" name="market" className="input">{markets.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>}
      <div><label className="label" htmlFor="scheduled_at">Schedule (UTC, optional)</label><input id="scheduled_at" name="scheduled_at" type="datetime-local" className="input" /></div>
      <div className="flex items-center gap-3 md:col-span-2">
        <button disabled={pending} className="btn-gold h-10 px-5">{pending ? "Sending…" : "Send / schedule"}</button>
        {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
        {state.message && <p role="status" className="text-sm text-emerald-300">{state.message}</p>}
      </div>
      <p className="text-xs text-muted md:col-span-2">Members only receive categories they have enabled. Each member receives a notification at most once (duplicates are prevented). Email and web push delivery require configured providers.</p>
    </form>
  );
}
