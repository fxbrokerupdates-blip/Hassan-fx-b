"use client";
import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

export function ShareButton({ url, title, contentId, label = false }: { url: string; title: string; contentId?: string; label?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const full = new URL(url, location.origin).toString();
    track("news_shared", { content_type: "article", content_id: contentId, metadata: { method: "share" in navigator ? "native" : "copy" } });
    try {
      if (navigator.share) { await navigator.share({ title, url: full }); return; }
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* user cancelled */ }
  }
  return (
    <button type="button" onClick={share} aria-label="Share"
      className={cn("inline-flex items-center gap-1 rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white", label && "px-3 py-2 ring-1 ring-white/15")}>
      {copied ? <Check className="size-4 text-emerald-400" /> : <Share2 className="size-4" />}
      {label && <span className="text-sm">{copied ? "Link copied" : "Share"}</span>}
    </button>
  );
}
