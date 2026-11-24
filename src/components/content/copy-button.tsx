"use client";
import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { track } from "@/lib/analytics/client";
import type { EventName } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

/**
 * Copies text to the clipboard and records one copy event per click.
 * Rapid repeat clicks within 10s are ignored client-side and de-duplicated server-side.
 */
export function CopyButton({ text, event, contentType, contentId, label = "Copy", className, disabled }: {
  text: string; event: EventName; contentType?: string; contentId?: string; label?: string; className?: string; disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const last = useRef(0);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    const now = Date.now();
    if (now - last.current > 10_000) {
      last.current = now;
      track(event, { content_type: contentType, content_id: contentId?.startsWith("sample-") ? undefined : contentId });
    }
  }
  return (
    <button type="button" onClick={copy} disabled={disabled} className={cn("btn-gold h-9 px-3 text-sm", className)} aria-live="polite">
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : label}
    </button>
  );
}
