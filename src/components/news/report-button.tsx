"use client";
import { useState } from "react";
import { Flag } from "lucide-react";
import { track } from "@/lib/analytics/client";

export function ReportButton({ contentType, contentId }: { contentType: "article" | "banner_prompt" | "video_script" | "broker"; contentId: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/reports", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ content_type: contentType, content_id: contentId, reason: fd.get("reason"), details: fd.get("details") }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) { setStatus("Please log in to report an issue."); return; }
    setStatus(res.ok ? "Thank you — our editors will review this." : j.error ?? "Could not send report.");
    if (res.ok) { track("report_submitted", { content_type: contentType, content_id: contentId }); setOpen(false); }
  }
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-gold-400">
        <Flag className="size-4" /> {contentType === "article" ? "Report incorrect information" : "Report issue"}
      </button>
      {open && (
        <form onSubmit={submit} className="card-plain mt-3 space-y-3 p-4">
          <select name="reason" className="input" aria-label="Reason" required>
            <option value="incorrect">Incorrect information</option><option value="outdated">Outdated</option>
            <option value="broken_link">Broken link</option><option value="copyright">Copyright concern</option>
            <option value="inappropriate">Inappropriate</option><option value="other">Other</option>
          </select>
          <textarea name="details" className="input min-h-24" maxLength={2000} placeholder="What should be corrected? Include a source if possible." />
          <button className="btn-gold h-9 px-4">Send report</button>
        </form>
      )}
      {status && <p role="status" className="mt-2 text-sm text-white/80">{status}</p>}
    </div>
  );
}
