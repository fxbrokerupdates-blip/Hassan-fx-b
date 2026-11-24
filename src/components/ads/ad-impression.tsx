"use client";
import { useEffect } from "react";

export function AdImpression({ id }: { id: string }) {
  useEffect(() => {
    const key = `fxbu_ad_${id}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
    navigator.sendBeacon?.("/api/ads", new Blob([JSON.stringify({ id, type: "impression" })], { type: "application/json" }));
  }, [id]);
  return null;
}

/** Sponsored link that counts a click (beacon) and records an analytics event. */
export function AdLink({ id, href, placement, children, className }: { id: string; href: string; placement: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="sponsored noopener noreferrer" className={className}
      onClick={() => {
        navigator.sendBeacon?.("/api/ads", new Blob([JSON.stringify({ id, type: "click" })], { type: "application/json" }));
        import("@/lib/analytics/client").then(({ track }) => track("ad_click", { content_type: "ad", content_id: id, metadata: { placement } }));
      }}>
      {children}
    </a>
  );
}
