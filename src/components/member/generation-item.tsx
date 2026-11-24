"use client";
import { useState, useTransition } from "react";
import { Copy, Download, Pencil, Save, Trash2 } from "lucide-react";
import { deleteGenerationAction, updateGenerationAction } from "@/app/dashboard/actions";
import { track } from "@/lib/analytics/client";
import { SaveButton } from "@/components/news/save-button";
import { formatDate } from "@/lib/utils";

export interface GenRow { id: string; content_type: string; title: string | null; output: string; created_at: string; is_saved: boolean; source_type: string; source_label?: string | null; provider: string | null; model: string | null }

export function GenerationItem({ g, label, open }: { g: GenRow; label: string; open?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(g.output);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [deleted, setDeleted] = useState(false);
  if (deleted) return null;
  return (
    <details open={open} className="card-plain group p-4" id={`gen-${g.id}`}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
        <span className="badge-tag">{label}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">{g.title ?? label}</span>
        {g.is_saved && <span className="badge-normal">Saved</span>}
        <span className="text-xs text-muted">{formatDate(g.created_at, "UTC", true)}</span>
      </summary>
      <div className="mt-3">
        {g.source_label && <p className="mb-2 text-xs text-muted">Source: {g.source_label}</p>}
        {editing ? (
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="input min-h-60 font-mono text-sm" aria-label="Edit content" />
        ) : (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-navy-950/70 p-3 font-mono text-[13px] leading-6 text-white/90">{text}</pre>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {editing ? (
            <button className="btn-gold h-8 px-3 text-sm" disabled={pending} onClick={() => start(async () => { const r = await updateGenerationAction(g.id, text); setMsg(r.error ?? "Saved."); if (!r.error) setEditing(false); })}><Save className="size-4" />Save</button>
          ) : (
            <button className="btn-outline h-8 px-3 text-sm" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit</button>
          )}
          <button className="btn-outline h-8 px-3 text-sm" onClick={async () => { await navigator.clipboard.writeText(text); setMsg("Copied."); track("ai_output_copy", { content_type: "ai_generation", content_id: g.id }); }}><Copy className="size-4" />Copy</button>
          <button className="btn-outline h-8 px-3 text-sm" onClick={() => {
            const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = `${g.content_type}-${g.created_at.slice(0, 10)}.txt`; a.click();
            track("ai_output_download", { content_type: "ai_generation", content_id: g.id });
          }}><Download className="size-4" />Download</button>
          <SaveButton type="ai_generation" id={g.id} title={g.title ?? label} initial={g.is_saved} label />
          <button className="btn-ghost h-8 px-3 text-sm text-red-300" disabled={pending} onClick={() => { if (confirm("Delete permanently?")) start(async () => { await deleteGenerationAction(g.id); setDeleted(true); }); }}><Trash2 className="size-4" />Delete</button>
          {msg && <span role="status" className="text-sm text-emerald-400">{msg}</span>}
        </div>
      </div>
    </details>
  );
}
