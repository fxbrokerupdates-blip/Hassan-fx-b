"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkStatusAction, deleteResourcesAction } from "@/app/admin/r/actions";

/** Selection checkboxes + bulk actions with confirmation for admin lists. */
export function BulkBar({ resource, ids, statuses, canDelete }: {
  resource: string; ids: string[]; statuses?: { value: string; label: string }[]; canDelete: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const selected = () => Array.from(document.querySelectorAll<HTMLInputElement>("input[data-row]:checked")).map((i) => i.value);
  const run = (fn: (ids: string[]) => Promise<{ error?: string; message?: string }>, confirmText: string) => {
    const s = selected();
    if (!s.length) { setMsg("Select at least one row."); return; }
    if (!confirm(confirmText.replace("{n}", String(s.length)))) return;
    start(async () => { const r = await fn(s); setMsg(r.error ?? r.message ?? null); router.refresh(); });
  };
  if (!ids.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" aria-label="Select all"
        onChange={(e) => document.querySelectorAll<HTMLInputElement>("input[data-row]").forEach((i) => { i.checked = e.target.checked; })} className="accent-[var(--primary-gold)]" />All</label>
      {statuses?.map((s) => (
        <button key={s.value} disabled={pending} onClick={() => run((x) => bulkStatusAction(resource, x, s.value), `Set {n} record(s) to “${s.label}”?`)}
          className="rounded-md px-2.5 py-1 ring-1 ring-white/15 hover:text-gold-400">Set {s.label}</button>
      ))}
      {canDelete && (
        <button disabled={pending} onClick={() => run((x) => deleteResourcesAction(resource, x), "Permanently delete {n} record(s)? This cannot be undone.")}
          className="rounded-md px-2.5 py-1 text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/10">Delete</button>
      )}
      {msg && <span role="status" className="text-white/80">{msg}</span>}
    </div>
  );
}
