"use client";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/client";
import type { EventName } from "@/lib/analytics/events";

/** Fires one event when mounted (e.g. article_open, broker_view). */
export function TrackOnMount({ event, content_type, content_id, metadata }: {
  event: EventName; content_type?: string; content_id?: string; metadata?: Record<string, string | number | boolean | null>;
}) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    track(event, { content_type, content_id, metadata });
  }, [event, content_type, content_id, metadata]);
  return null;
}

/**
 * Article reading engagement: progress milestones by scroll depth and an
 * "article_engaged" event after 15s of visible time plus ≥50% scroll.
 */
export function ArticleEngagement({ id, newsType }: { id: string; newsType: string }) {
  useEffect(() => {
    const sent = new Set<number>();
    let engaged = false;
    let visibleMs = 0;
    let last = Date.now();
    const tick = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === "visible") visibleMs += now - last;
      last = now;
      check();
    }, 1000);
    const depth = () => {
      const el = document.getElementById("article-body");
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const seen = Math.min(Math.max(window.innerHeight - r.top, 0), r.height);
      return r.height > 0 ? Math.round((seen / r.height) * 100) : 100;
    };
    const check = () => {
      const d = depth();
      for (const m of [25, 50, 75, 100]) {
        if (d >= m && !sent.has(m)) {
          sent.add(m);
          track("article_progress", { content_type: "article", content_id: id, metadata: { milestone: m, news_type: newsType } });
        }
      }
      if (!engaged && visibleMs >= 15000 && d >= 50) {
        engaged = true;
        track("article_engaged", { content_type: "article", content_id: id, engaged_seconds: Math.round(visibleMs / 1000), metadata: { news_type: newsType } });
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    return () => { clearInterval(tick); window.removeEventListener("scroll", check); };
  }, [id, newsType]);
  return null;
}
