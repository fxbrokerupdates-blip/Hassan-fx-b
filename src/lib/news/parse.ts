import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";

export interface FeedItem { title: string; link: string; publishedAt: string | null; summary: string; author?: string }

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
function decodeEntities(s: string): string {
  return s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    try {
      if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    } catch { return " "; }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Feed text → plain text. Decodes first because many feeds entity-encode their HTML. */
export function stripHtml(s: string): string {
  const unwrapped = decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
  return decodeEntities(unwrapped.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const text = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") { const o = v as Record<string, unknown>; return text(o["#text"] ?? o["@_href"] ?? ""); }
  return "";
};

/** Parses RSS 2.0, Atom and JSON Feed into normalized items. */
export function parseFeed(body: string): FeedItem[] {
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) {
    try {
      const j = JSON.parse(trimmed) as { items?: { title?: string; url?: string; date_published?: string; summary?: string; content_text?: string }[] };
      return (j.items ?? []).map((i) => ({ title: stripHtml(i.title ?? ""), link: i.url ?? "", publishedAt: i.date_published ?? null, summary: stripHtml(i.summary ?? i.content_text ?? "") }));
    } catch { return []; }
  }
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: false, htmlEntities: false });
  const doc = parser.parse(trimmed) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const rssItems = doc?.rss?.channel?.item ?? doc?.["rdf:RDF"]?.item;
  if (rssItems) {
    return (Array.isArray(rssItems) ? rssItems : [rssItems]).map((i) => ({
      title: stripHtml(text(i.title)), link: text(i.link) || text(i.guid),
      publishedAt: text(i.pubDate) || text(i["dc:date"]) || null,
      summary: stripHtml(text(i.description) || text(i["content:encoded"])), author: stripHtml(text(i["dc:creator"]) || text(i.author)) || undefined,
    }));
  }
  const entries = doc?.feed?.entry;
  if (entries) {
    return (Array.isArray(entries) ? entries : [entries]).map((e) => {
      const links = Array.isArray(e.link) ? e.link : [e.link];
      const alt = links.find((l: Record<string, string>) => !l?.["@_rel"] || l["@_rel"] === "alternate") ?? links[0];
      return { title: stripHtml(text(e.title)), link: alt?.["@_href"] ?? text(alt), publishedAt: text(e.published) || text(e.updated) || null,
        summary: stripHtml(text(e.summary) || text(e.content)), author: stripHtml(text(e.author?.name)) || undefined };
    });
  }
  return [];
}

const STOP = new Set("a an the and or of to in on for with at by from is are was be as its it this that after over amid into new says report".split(" "));
export function titleTokens(title: string): string[] {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
}
export function fingerprint(title: string): string {
  return [...new Set(titleTokens(title))].sort().slice(0, 14).join(" ");
}
export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
export function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    for (const k of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_)/i.test(k)) url.searchParams.delete(k);
    url.hostname = url.hostname.replace(/^www\./, "");
    return url.toString().replace(/\/$/, "");
  } catch { return u.trim(); }
}
export const urlHash = (u: string) => createHash("sha256").update(normalizeUrl(u)).digest("hex").slice(0, 40);

export function normalizeDate(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const now = Date.now();
  return new Date(Math.min(d.getTime(), now)).toISOString(); // never in the future
}
