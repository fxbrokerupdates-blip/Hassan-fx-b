"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkUserStatusAction } from "@/app/admin/actions";

export function UserBulkBar({ canManage }: { canManage: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const sel = () => Array.from(document.querySelectorAll<HTMLInputElement>("input[data-row]:checked")).map((i) => i.value);
  const run = (status: "active" | "suspended") => {
    const ids = sel();
    if (!ids.length) { setMsg("Select users first."); return; }
    if (!confirm(`${status === "suspended" ? "Suspend" : "Reactivate"} ${ids.length} user(s)?`)) return;
    start(async () => { const r = await bulkUserStatusAction(ids, status); setMsg(r.error ?? r.message ?? null); router.refresh(); });
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" className="accent-[var(--primary-gold)]" aria-label="Select all"
        onChange={(e) => document.querySelectorAll<HTMLInputElement>("input[data-row]").forEach((i) => { i.checked = e.target.checked; })} />All</label>
      {canManage && <><button disabled={pending} onClick={() => run("suspended")} className="rounded-md px-2.5 py-1 text-red-300 ring-1 ring-red-500/40">Suspend</button>
        <button disabled={pending} onClick={() => run("active")} className="rounded-md px-2.5 py-1 ring-1 ring-white/15">Reactivate</button></>}
      {msg && <span role="status">{msg}</span>}
    </div>
  );
}
