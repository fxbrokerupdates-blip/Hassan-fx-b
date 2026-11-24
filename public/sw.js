/* FX Broker Updates service worker.
 * - Caches only static, public assets (never authenticated pages or API responses).
 * - Network-first for navigations with an offline fallback page.
 * - Bump CACHE_VERSION to invalidate safely on deploy.
 */
const CACHE_VERSION = "fxbu-v1";
const STATIC = ["/offline.html", "/images/logo.png", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/auth")) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
/* Web push (OneSignal or VAPID) — payload: {title, body, url} */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: "FX Broker Updates", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "FX Broker Updates", { body: d.body || "", icon: "/icons/icon-192.png", data: { url: d.url || "/dashboard/notifications" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data && e.notification.data.url ? e.notification.data.url : "/"));
});
