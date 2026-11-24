"use client";
import { useState, useTransition } from "react";
import { Play, RefreshCw } from "lucide-react";
import { recalcAnalyticsAction, runJobNowAction, runSourceNowAction } from "@/app/admin/actions";

function useRunner() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok?: boolean; error?: string; message?: string }>) =>
    start(async () => { const r = await fn(); setMsg({ ok: !r.error, text: r.error ?? r.message ?? "Done" }); });
  return { msg, pending, run };
}
const Msg = ({ m }: { m: { ok: boolean; text: string } | null }) =>
  m ? <p role="status" className={`mt-2 text-xs ${m.ok ? "text-emerald-300" : "text-red-300"}`}>{m.text}</p> : null;

export function RunSourceButton({ sourceId }: { sourceId: string }) {
  const { msg, pending, run } = useRunner();
  return <div><button disabled={pending} onClick={() => run(() => runSourceNowAction(sourceId))} className="btn-gold h-9 w-full text-sm"><RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />Refresh this source now</button><Msg m={msg} /></div>;
}
export function RunJobButton({ jobKey, label = "Run now" }: { jobKey: string; label?: string }) {
  const { msg, pending, run } = useRunner();
  return <div><button disabled={pending} onClick={() => run(() => runJobNowAction(jobKey))} className="btn-outline h-8 px-3 text-xs"><Play className="size-3.5" />{pending ? "Running…" : label}</button><Msg m={msg} /></div>;
}
export function RecalcButton() {
  const { msg, pending, run } = useRunner();
  return <div className="flex items-center gap-2"><button disabled={pending} onClick={() => run(recalcAnalyticsAction)} className="btn-outline h-10 px-4 text-sm"><RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />Recalculate now</button><Msg m={msg} /></div>;
}
