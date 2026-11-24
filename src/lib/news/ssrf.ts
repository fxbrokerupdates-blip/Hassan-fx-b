import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** True for loopback, private, link-local, CGNAT, multicast and reserved ranges (IPv4 + IPv6). */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("ff");
}

export class SsrfError extends Error {}

/** Validates that a URL is https on a public host, resolving DNS to block internal targets. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new SsrfError("Invalid URL"); }
  if (url.protocol !== "https:") throw new SsrfError("Only https URLs are allowed");
  if (url.username || url.password) throw new SsrfError("Credentials in URL are not allowed");
  if (url.port && url.port !== "443") throw new SsrfError("Non-standard ports are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i.test(host)) throw new SsrfError("Internal host not allowed");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => { throw new SsrfError("DNS lookup failed"); });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new SsrfError("Resolved to a private or reserved address");
  return url;
}

/**
 * Fetches a public URL safely: https only, DNS-checked, manual redirects (re-validated, max 3),
 * timeout and response size cap.
 */
export async function safeFetch(raw: string, opts: { timeoutMs?: number; maxBytes?: number; headers?: Record<string, string> } = {}) {
  let current = raw;
  for (let hop = 0; hop < 4; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      redirect: "manual", signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
      headers: { "User-Agent": "FXBrokerUpdatesBot/1.0 (+https://www.fxbrokerupdates.com/about)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json;q=0.9, */*;q=0.5", ...opts.headers },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, url).toString();
      continue;
    }
    const max = opts.maxBytes ?? 2_000_000;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > max) throw new SsrfError("Response too large");
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > max) { await reader.cancel(); throw new SsrfError("Response too large"); }
        chunks.push(value);
      }
    }
    const body = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
    return { status: res.status, headers: res.headers, body };
  }
  throw new SsrfError("Too many redirects");
}
