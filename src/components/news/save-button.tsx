"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

const EVENT = { article: "news_saved", banner_prompt: "banner_prompt_save", video_script: "video_script_save", ai_generation: "ai_output_save", broker: "content_saved" } as const;

/** Toggles a saved item for the signed-in member (redirects guests to login). */
export function SaveButton({ type, id, title, initial = false, label = false }: {
  type: keyof typeof EVENT; id: string; title?: string; initial?: boolean; label?: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function toggle() {
    if (id.startsWith("sample-")) { alert("Sample items cannot be saved. Connect Supabase to use saving."); return; }
    setBusy(true);
    const res = await fetch("/api/saved", {
      method: saved ? "DELETE" : "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ content_type: type, content_id: id, title }),
    });
    setBusy(false);
    if (res.status === 401) { router.push(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
    if (res.ok) {
      if (!saved) track(EVENT[type], { content_type: type, content_id: id });
      setSaved(!saved);
    }
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save"}
      className={cn("inline-flex items-center gap-1 rounded-md p-1.5 hover:bg-white/10", saved ? "text-gold-400" : "text-white/70", label && "px-3 py-2 ring-1 ring-white/15")}>
      <Bookmark className={cn("size-4", saved && "fill-gold-400")} />
      {label && <span className="text-sm">{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
