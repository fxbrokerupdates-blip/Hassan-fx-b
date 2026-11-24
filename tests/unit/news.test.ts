import { describe, expect, it } from "vitest";
import { parseFeed, fingerprint, jaccard, titleTokens, normalizeUrl, normalizeDate, stripHtml } from "@/lib/news/parse";
import { classify } from "@/lib/news/classify";
import { parseScriptSections } from "@/lib/jobs/automation";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
<item><title><![CDATA[Gold &amp; silver rise <b>ahead</b> of Fed decision]]></title><link>https://news.example.com/a?utm_source=x</link>
<pubDate>Mon, 23 Nov 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Prices moved higher.&lt;/p&gt;</description></item>
<item><title>Second item title here</title><link>https://news.example.com/b</link></item></channel></rss>`;
const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom entry headline</title>
<link rel="alternate" href="https://ex.com/atom-1"/><updated>2026-11-20T08:00:00Z</updated><summary>Short summary</summary></entry></feed>`;

describe("feed parsing", () => {
  it("parses RSS", () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Gold & silver rise ahead of Fed decision");
    expect(items[0].summary).toBe("Prices moved higher.");
    expect(normalizeUrl(items[0].link)).toBe("https://news.example.com/a");
  });
  it("parses Atom and JSON Feed", () => {
    expect(parseFeed(ATOM)[0]).toMatchObject({ title: "Atom entry headline", link: "https://ex.com/atom-1" });
    expect(parseFeed(JSON.stringify({ items: [{ title: "J", url: "https://j.com/1" }] }))[0].link).toBe("https://j.com/1");
  });
  it("normalizes dates and never accepts future timestamps", () => {
    expect(normalizeDate("not a date")).toBeNull();
    expect(new Date(normalizeDate("2999-01-01T00:00:00Z")!).getTime()).toBeLessThanOrEqual(Date.now());
  });
  it("detects similar headlines", () => {
    const a = titleTokens("Gold holds above key level ahead of US inflation data");
    const b = titleTokens("Gold holds above key level ahead of the US inflation data");
    expect(jaccard(a, b)).toBeGreaterThan(0.82);
    expect(jaccard(a, titleTokens("Bitcoin falls after ETF outflows"))).toBeLessThan(0.2);
    expect(fingerprint("The Fed and the ECB")).toBe("ecb fed");
    expect(stripHtml("<script>x</script>Hi &amp; bye")).toBe("Hi & bye");
  });
});

describe("classification", () => {
  const base = { summary: "", trusted: true, newsType: "trading", brokers: [{ id: "b1", name: "Atlas FX" }], hotKeywords: ["breaking", "rate decision"], riskKeywords: ["scam", "fraud"] };
  it("detects markets", () => {
    expect(classify({ ...base, title: "Gold climbs as dollar slips" }).market).toBe("gold");
    expect(classify({ ...base, title: "FOMC rate decision looms" }).market).toBe("central_banks");
  });
  it("never marks promotional wording as HOT", () => {
    expect(classify({ ...base, newsType: "broker", title: "BREAKING: 100% deposit bonus offer!" }).priority).not.toBe("hot");
    expect(classify({ ...base, title: "Breaking: Fed rate decision surprises markets" }).priority).toBe("hot");
    expect(classify({ ...base, trusted: false, title: "Breaking: Fed rate decision surprises markets" }).priority).toBe("warm");
  });
  it("routes high-risk items to review and maps brokers", () => {
    const c = classify({ ...base, newsType: "broker", title: "Regulator warns of Atlas FX clone scam" });
    expect(c.highRisk).toBe(true);
    expect(c.brokerId).toBe("b1");
  });
});

describe("script parsing", () => {
  it("splits sections", () => {
    const s = parseScriptSections("HOOK: Big news.\nMAIN SCRIPT: Body text here.\nCLOSING: Bye.\nCTA: Follow us.");
    expect(s).toEqual({ hook: "Big news.", body: "Body text here.", closing: "Bye.", cta: "Follow us." });
  });
});
