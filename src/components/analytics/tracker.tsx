"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  configure, flush, getConsent, getSession, getTabId, getVisitorId, setConsent, setEnabled, track,
} from "@/lib/analytics/client";
import { featureFromPath, sanitizePath } from "@/lib/analytics/events";

interface TrackingConfig {
  enabled: boolean; heartbeat_seconds: number; idle_seconds: number; anonymous_requires_consent: boolean;
}

/**
 * Page views + presence heartbeat.
 * - Heartbeat every ~45s only while the tab is visible.
 * - Engaged time is counted only when the tab is visible, focused and there was a
 *   pointer/scroll/key interaction within the idle window (key *values* are never read).
 * - Hidden or abandoned tabs stop sending and drop offline after missed heartbeats.
 */
export function AnalyticsTracker({ config }: { config: TrackingConfig }) {
  const pathname = usePathname();
  const lastInteraction = useRef<number>(0);
  const lastBeat = useRef<number>(0);
  // Consent lives in localStorage; "pending" on the server so the banner never flashes during SSR.
  const consent = useSyncExternalStore(
    (cb) => { window.addEventListener("fxbu:consent", cb); window.addEventListener("storage", cb); return () => { window.removeEventListener("fxbu:consent", cb); window.removeEventListener("storage", cb); }; },
    () => getConsent(),
    () => "pending" as const,
  );

  useEffect(() => {
    configure({ anonymousRequiresConsent: config.anonymous_requires_consent });
    setEnabled(config.enabled);
  }, [config.anonymous_requires_consent, config.enabled]);

  // page views
  useEffect(() => {
    if (!config.enabled) return;
    track("page_view", { metadata: { title: document.title.slice(0, 120) } });
  }, [pathname, config.enabled]);

  // interaction + heartbeat
  useEffect(() => {
    if (!config.enabled) return;
    const interval = Math.min(Math.max(config.heartbeat_seconds || 45, 15), 120) * 1000;
    const idleMs = Math.max(config.idle_seconds || 120, 30) * 1000;
    let lastMove = 0;
    const mark = () => { lastInteraction.current = Date.now(); };
    const onMove = () => { const n = Date.now(); if (n - lastMove > 5000) { lastMove = n; mark(); } };
    const opts = { passive: true } as AddEventListenerOptions;
    ["pointerdown", "keydown", "scroll", "touchstart", "wheel"].forEach((e) => window.addEventListener(e, mark, opts));
    window.addEventListener("mousemove", onMove, opts);
    mark();
    lastBeat.current = Date.now();

    const beat = (final = false) => {
      const now = Date.now();
      const visible = document.visibilityState === "visible";
      const interacted = now - lastInteraction.current < idleMs;
      const focused = typeof document.hasFocus === "function" ? document.hasFocus() : true;
      const delta = Math.round((now - lastBeat.current) / 1000);
      lastBeat.current = now;
      const body = JSON.stringify({
        session_id: getSession().id, visitor_id: getVisitorId(), tab_id: getTabId(),
        path: sanitizePath(location.pathname + location.search), feature: featureFromPath(location.pathname),
        visible: visible || final, interacted: interacted && focused, engaged_delta: visible || final ? delta : 0,
      });
      if (final && navigator.sendBeacon) navigator.sendBeacon("/api/heartbeat", new Blob([body], { type: "application/json" }));
      else fetch("/api/heartbeat", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
    };

    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!id) id = setInterval(() => document.visibilityState === "visible" && beat(), interval); };
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { beat(true); flush(true); stop(); }
      else { lastBeat.current = Date.now(); beat(); start(); }
    };
    const onHide = () => { flush(true); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    const first = setTimeout(() => beat(), 2000);
    start();
    return () => {
      clearTimeout(first); stop();
      ["pointerdown", "keydown", "scroll", "touchstart", "wheel"].forEach((e) => window.removeEventListener(e, mark));
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, [config.enabled, config.heartbeat_seconds, config.idle_seconds]);

  const hideBanner = !config.enabled || !config.anonymous_requires_consent || consent !== null || pathname.startsWith("/admin");
  if (hideBanner) return null;
  return (
    <div role="region" aria-label="Privacy choices"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-xl border border-gold-500/60 bg-navy-900/98 p-4 shadow-2xl sm:flex sm:items-center sm:gap-4">
      <p className="text-sm leading-5 text-white/85">
        We use first-party analytics on FX Broker Updates only (no ad trackers, no recordings) to improve the site.
        Choose whether we may remember this browser. <Link href="/privacy" className="text-gold-400 underline">Privacy Policy</Link>
      </p>
      <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
        <button onClick={() => setConsent("denied")} className="btn-outline h-9 px-3 text-sm">Essential only</button>
        <button onClick={() => setConsent("granted")} className="btn-gold h-9 px-3 text-sm">Accept analytics</button>
      </div>
    </div>
  );
}
