"use client";
import { useState, useTransition } from "react";
import { updateJobAction } from "@/app/admin/actions";

export function JobControls({ jobKey, enabled, interval }: { jobKey: string; enabled: boolean; interval: number }) {
  const [on, setOn] = useState(enabled);
  const [mins, setMins] = useState(String(interval));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="accent-[var(--primary-gold)]" />On</label>
      <input value={mins} onChange={(e) => setMins(e.target.value)} className="input h-8 w-20 py-0 text-xs" aria-label="Interval minutes" />
      <span className="text-xs text-muted">min</span>
      <button disabled={pending} onClick={() => start(async () => { const r = await updateJobAction(jobKey, on, Number(mins)); setMsg(r.error ?? "Saved"); })} className="btn-outline h-8 px-2 text-xs">Save</button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
