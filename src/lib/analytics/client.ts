"use client";
/**
 * Browser-side first-party analytics. Sends only whitelisted event names, a
 * sanitized path and small metadata. No keystrokes, form values or clipboard
 * contents are ever read or sent.
 */
import { sanitizePath, featureFromPath, type EventName } from "@/lib/analytics/events";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const CONSENT_KEY = "fxbu_analytics_consent";
const VISITOR_KEY = "fxbu_vid";
const SESSION_KEY = "fxbu_sid";

type Consent = "granted" | "denied" | null;
interface QueuedEvent {
  event_id: string; event_name: EventName; feature?: string; content_type?: string; content_id?: string;
  path: string; engaged_seconds?: number; metadata?: Record<string, string | number | boolean | null>; occurred_at: string;
}

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));

function safeStorage(kind: "local" | "session"): Storage | null {
  try {
    const s = kind === "local" ? window.localStorage : window.sessionStorage;
    s.setItem("__t", "1"); s.removeItem("__t");
    return s;
  } catch { return null; }
}

export function getConsent(): Consent {
  const v = safeStorage("local")?.getItem(CONSENT_KEY);
  return v === "granted" || v === "denied" ? v : null;
}
export function setConsent(v: "granted" | "denied") {
  const ls = safeStorage("local");
  ls?.setItem(CONSENT_KEY, v);
  if (v === "denied") { ls?.removeItem(VISITOR_KEY); ls?.removeItem(SESSION_KEY); }
  window.dispatchEvent(new CustomEvent("fxbu:consent", { detail: v }));
}

let requireConsent = true;
export function configure(opts: { anonymousRequiresConsent: boolean }) { requireConsent = opts.anonymousRequiresConsent; }
const persistentAllowed = () => !requireConsent || getConsent() === "granted";

/** Anonymous visitor id — only when persistent storage is allowed. */
export function getVisitorId(): string | null {
  if (!persistentAllowed()) return null;
  const ls = safeStorage("local");
  if (!ls) return null;
  let v = ls.getItem(VISITOR_KEY);
  if (!v || !/^[a-zA-Z0-9_-]{8,64}$/.test(v)) { v = uuid().replace(/-/g, ""); ls.setItem(VISITOR_KEY, v); }
  return v;
}

/** Session id shared across tabs when storage is allowed (otherwise per tab). Expires after 30 min idle. */
export function getSession(): { id: string; isNew: boolean } {
  const store = persistentAllowed() ? safeStorage("local") : safeStorage("session");
  const now = Date.now();
  try {
    const raw = store?.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id: string; last: number };
      if (parsed.id && now - parsed.last < SESSION_TIMEOUT_MS) {
        store?.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, last: now }));
        return { id: parsed.id, isNew: false };
      }
    }
  } catch { /* ignore */ }
  const id = uuid();
  store?.setItem(SESSION_KEY, JSON.stringify({ id, last: now }));
  return { id, isNew: true };
}

let tabId: string | null = null;
export function getTabId(): string {
  if (tabId) return tabId;
  const ss = safeStorage("session");
  tabId = ss?.getItem("fxbu_tab") ?? uuid().slice(0, 12);
  ss?.setItem("fxbu_tab", tabId);
  return tabId;
}

const queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let enabled = true;
export function setEnabled(v: boolean) { enabled = v; }

function context() {
  const ref = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : "";
  const u = new URL(location.href);
  return {
    session_id: getSession().id,
    visitor_id: getVisitorId(),
    landing_path: sanitizePath(location.pathname + location.search),
    referrer: ref,
    utm_source: u.searchParams.get("utm_source") ?? undefined,
    utm_medium: u.searchParams.get("utm_medium") ?? undefined,
    utm_campaign: u.searchParams.get("utm_campaign") ?? undefined,
    viewport: window.innerWidth,
  };
}

export function flush(useBeacon = false) {
  if (!queue.length) return;
  const batch = queue.splice(0, 25);
  const body = JSON.stringify({ ...context(), events: batch });
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
  } else {
    fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  }
  if (queue.length) schedule();
}

function schedule() {
  if (timer) return;
  timer = setTimeout(() => { timer = null; flush(); }, 3000);
}

/** Records an event (fire-and-forget). */
export function track(
  name: EventName,
  data: { feature?: string; content_type?: string; content_id?: string; engaged_seconds?: number; metadata?: QueuedEvent["metadata"] } = {},
) {
  if (typeof window === "undefined" || !enabled) return;
  const path = sanitizePath(location.pathname + location.search);
  queue.push({
    event_id: uuid(), event_name: name, path, occurred_at: new Date().toISOString(),
    feature: data.feature ?? featureFromPath(location.pathname), content_type: data.content_type, content_id: data.content_id,
    engaged_seconds: data.engaged_seconds, metadata: data.metadata,
  });
  // Views and reading progress are batched; meaningful actions (copy, save, follow…) are sent immediately.
  const batched = name === "article_progress" || name.endsWith("_view");
  if (!batched || queue.length >= 10) flush(); else schedule();
}
