import "server-only";

export function parseUserAgent(ua: string | null): { device: "desktop" | "mobile" | "tablet" | "bot" | "unknown"; browser: string; os: string } {
  const s = ua ?? "";
  if (!s) return { device: "unknown", browser: "Unknown", os: "Unknown" };
  const bot = /bot|crawler|spider|crawling|headless|lighthouse|preview/i.test(s);
  const tablet = /ipad|tablet|(android(?!.*mobile))/i.test(s);
  const mobile = /mobi|iphone|ipod|android.*mobile|windows phone/i.test(s);
  const browser = /edg\//i.test(s) ? "Edge" : /opr\/|opera/i.test(s) ? "Opera" : /samsungbrowser/i.test(s) ? "Samsung Internet"
    : /firefox|fxios/i.test(s) ? "Firefox" : /chrome|crios/i.test(s) ? "Chrome" : /safari/i.test(s) ? "Safari" : "Other";
  const os = /windows/i.test(s) ? "Windows" : /iphone|ipad|ipod/i.test(s) ? "iOS" : /android/i.test(s) ? "Android"
    : /mac os/i.test(s) ? "macOS" : /linux/i.test(s) ? "Linux" : "Other";
  return { device: bot ? "bot" : tablet ? "tablet" : mobile ? "mobile" : "desktop", browser, os };
}

const SOCIAL = /(facebook|fb\.|instagram|linkedin|lnkd|t\.co|twitter|x\.com|youtube|tiktok|telegram|t\.me|whatsapp|reddit|pinterest)/i;
const SEARCH = /(google\.|bing\.|yahoo\.|duckduckgo|baidu|yandex|ecosia)/i;
const EMAIL = /(mail\.|outlook|gmail)/i;

export function referrerHost(ref: string | null | undefined): string | null {
  if (!ref) return null;
  try {
    const u = new URL(ref);
    return /^https?:$/.test(u.protocol) ? u.hostname.replace(/^www\./, "").slice(0, 120) : null;
  } catch {
    return null;
  }
}

export function trafficSource(host: string | null, siteHost: string, utmMedium?: string | null): "direct" | "organic" | "social" | "referral" | "email" | "paid" | "internal" {
  const m = (utmMedium ?? "").toLowerCase();
  if (/cpc|ppc|paid|display|ads?/.test(m)) return "paid";
  if (m === "email" || m === "newsletter") return "email";
  if (m === "social") return "social";
  if (!host) return "direct";
  if (host === siteHost.replace(/^www\./, "")) return "internal";
  if (SEARCH.test(host)) return "organic";
  if (SOCIAL.test(host)) return "social";
  if (EMAIL.test(host)) return "email";
  return "referral";
}

/** Country from the hosting edge (2-letter code). IP addresses are never read or stored. */
export function countryFromHeaders(h: Headers): string | null {
  const c = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  return c && /^[A-Z]{2}$/.test(c) && c !== "XX" ? c : null;
}

/** Keeps metadata small and non-sensitive: primitive values, short keys, no emails/long strings. */
export function sanitizeMetadata(m: unknown): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!m || typeof m !== "object") return out;
  for (const [k, v] of Object.entries(m as Record<string, unknown>).slice(0, 12)) {
    if (!/^[a-z_]{1,32}$/.test(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean" || v === null) out[k] = v;
    else if (typeof v === "string") {
      const s = v.slice(0, 160);
      if (/@[^\s]+\.[a-z]{2,}/i.test(s)) continue; // never store email-like strings
      out[k] = s;
    }
  }
  return out;
}
