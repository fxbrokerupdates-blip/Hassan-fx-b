"use client";
import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendCampaignAction } from "@/app/admin/actions";

export function CampaignSendButton({ id, status }: { id: string; status: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (status === "sent") return <p className="text-sm text-emerald-300">This campaign has been sent.</p>;
  return (
    <div>
      <button disabled={pending} className="btn-gold h-9 w-full text-sm" onClick={() => {
        if (!confirm("Send this campaign to all consented subscribers in the selected audience now?")) return;
        start(async () => { const r = await sendCampaignAction(id); setMsg(r.error ?? r.message ?? null); });
      }}><Send className="size-4" />{pending ? "Sending…" : "Send now"}</button>
      {msg && <p role="status" className="mt-2 text-xs text-white/80">{msg}</p>}
      <p className="mt-2 text-xs text-muted">Only subscribers with active consent receive it. Every email includes one-click unsubscribe.</p>
    </div>
  );
}
