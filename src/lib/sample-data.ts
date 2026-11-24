/**
 * DEVELOPMENT-ONLY SAMPLE CONTENT.
 * Shown only when Supabase is not configured and the app is not in production.
 * Every item is flagged is_sample and rendered with a visible "SAMPLE" badge.
 * Brokers are fictional; headlines are placeholders, not real news.
 */
import type { Article, BannerPrompt, Broker, VideoScript } from "@/types/db";
import { DEFAULT_CATEGORIES } from "@/lib/defaults";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);

const brokerBase = (slug: string, name: string): Broker => ({
  id: `sample-broker-${slug}`, slug, name, logo_url: null, website_url: `https://example.com/${slug}`, founded_year: null,
  headquarters: "Sample City", countries_served: [], platforms: ["MT4", "MT5"], account_types: ["Standard", "Raw"],
  min_deposit: null, instruments: ["Forex", "Metals", "Indices"], payment_methods: [], social_links: {},
  short_description: "Fictional sample broker used for development previews.",
  editorial_review: "Sample editorial review placeholder. Replace with a verified review before launch.",
  is_featured: false, is_sponsored: false, affiliate_disclosure: null, status: "active", last_verified_at: null,
  is_sample: true, created_at: hoursAgo(500),
});

export const SAMPLE_BROKERS: Broker[] = [
  brokerBase("northbridge-markets", "Northbridge Markets"),
  brokerBase("atlas-fx", "Atlas FX"),
  brokerBase("meridian-capital", "Meridian Capital"),
  brokerBase("harbor-trade", "Harbor Trade"),
];

const brokerItems: [string, string, Article["priority"], string][] = [
  ["northbridge-markets", "broker-news", "hot", "Sample: Northbridge Markets publishes quarterly trading volume report"],
  ["atlas-fx", "deposit-withdrawal", "normal", "Sample: Atlas FX adds new local payment methods"],
  ["meridian-capital", "new-trading-products", "warm", "Sample: Meridian Capital launches a zero-commission account type"],
  ["harbor-trade", "platform-updates", "normal", "Sample: Harbor Trade rolls out a redesigned mobile app"],
  ["northbridge-markets", "promotions-bonuses", "normal", "Sample: Northbridge Markets announces a seasonal deposit campaign"],
  ["atlas-fx", "regulatory-updates", "warm", "Sample: Atlas FX describes an update to its licensing status"],
  ["meridian-capital", "ib-affiliate", "normal", "Sample: Meridian Capital revises its IB commission structure"],
  ["harbor-trade", "scam-alerts", "hot", "Sample: How to spot clone websites impersonating brokers"],
  ["atlas-fx", "executive-appointments", "normal", "Sample: Atlas FX appoints a new head of partnerships"],
  ["northbridge-markets", "broker-awards", "normal", "Sample: Northbridge Markets shortlisted for an industry award"],
];

const tradingItems: [string, Article["priority"], string, NonNullable<Article["market_impact"]>][] = [
  ["gold", "hot", "Sample: Gold (XAUUSD) holds a key level ahead of US data", "high"],
  ["forex", "warm", "Sample: US Dollar firms after central bank commentary", "medium"],
  ["crypto", "normal", "Sample: Bitcoin trades in a narrow range as volumes ease", "medium"],
  ["central_banks", "warm", "Sample: Markets weigh the next rate decision", "high"],
  ["oil", "normal", "Sample: Oil prices react to supply headlines", "medium"],
  ["stock_markets", "normal", "Sample: Global equities mixed in early trade", "low"],
  ["economic_data", "warm", "Sample: Inflation data in focus this week", "high"],
  ["geopolitics", "normal", "Sample: Risk sentiment shifts on geopolitical headlines", "medium"],
  ["market_analysis", "normal", "Sample: Weekly technical outlook for major pairs", "low"],
];

const baseArticle = (): Omit<Article, "id" | "slug" | "title" | "news_type" | "priority" | "published_at"> => ({
  summary: "[SAMPLE CONTENT] Placeholder summary for development. This is not real news and must not be published.",
  content: "[SAMPLE CONTENT]\n\nThis placeholder article exists only to preview layouts in development mode. Replace it with verified editorial content from an authorised source.",
  content_origin: "original", key_highlights: ["Sample highlight one", "Sample highlight two"], featured_image_url: null,
  category_id: null, broker_id: null, market: null, market_impact: null, country: null, author_name: "FX Broker Updates Desk",
  source_name: "Sample Source", original_url: null, original_published_at: null, status: "published", updated_at: hoursAgo(1),
  is_featured: false, reading_minutes: 2, seo_title: null, seo_description: null, canonical_url: null, noindex: true,
  is_sample: true, view_count: 0,
});

export const SAMPLE_ARTICLES: Article[] = [
  ...brokerItems.map(([b, c, p, title], i): Article => {
    const cat = DEFAULT_CATEGORIES.find((x) => x.slug === c)!;
    const broker = SAMPLE_BROKERS.find((x) => x.slug === b)!;
    return {
      ...baseArticle(), id: `sample-b-${i}`, slug: slugify(title), title, news_type: "broker", priority: p,
      published_at: hoursAgo((i + 1) * 3), featured_image_url: "/images/sample-broker.webp", category_id: cat.id,
      broker_id: broker.id, category: { slug: cat.slug, name: cat.name }, broker: { slug: broker.slug, name: broker.name },
      is_featured: i === 0,
    };
  }),
  ...tradingItems.map(([m, p, title, impact], i): Article => ({
    ...baseArticle(), id: `sample-t-${i}`, slug: slugify(title), title, news_type: "trading", priority: p,
    published_at: hoursAgo((i + 1) * 2), featured_image_url: "/images/sample-trading.webp", market: m, market_impact: impact,
    category_id: "cat-market-news", category: { slug: "market-news", name: "Market News" }, is_featured: i === 0,
  })),
];

export const SAMPLE_PROMPTS: BannerPrompt[] = [
  ["Sample: Gold market update banner", "gold", "1:1"],
  ["Sample: Broker news announcement banner", "broker_news", "16:9"],
  ["Sample: Forex weekly outlook banner", "forex", "4:5"],
  ["Sample: Crypto market story banner", "crypto", "9:16"],
].map(([title, category, ar], i) => {
  const text = `[SAMPLE] Create a premium financial news banner, deep navy background (#06182D) with gold (#F5C542) accents, subtle candlestick chart lines, clean empty space on the left for a bold headline, soft studio lighting, high detail, professional media style, aspect ratio ${ar}.`;
  return {
    id: `sample-p-${i}`, title, prompt_text: i === 0 ? text : undefined, prompt_preview: `${text.slice(0, 160)}…`,
    preview_image_url: "/images/banner-prompt.png", category, tags: [], aspect_ratio: ar, language: "en",
    related_article_id: null, publish_date: new Date().toISOString().slice(0, 10), published_at: hoursAgo(i),
    is_featured: i === 0, access_level: i === 0 ? "public" : "members", copy_enabled: true, is_sample: true,
  };
});

export const SAMPLE_SCRIPTS: VideoScript[] = [
  ["Sample: 40-second gold market update", 40, "en"],
  ["Sample: 60-second broker news roundup", 60, "en"],
  ["Sample: 30-second Roman Urdu market intro", 30, "roman_ur"],
].map(([title, d, lang], i) => ({
  id: `sample-s-${i}`, title: title as string, topic: "Sample topic", hook: "[SAMPLE] Here is what traders are watching today.",
  body: i === 0 ? "[SAMPLE] Placeholder main script body for development previews. Replace with content based on verified news." : undefined,
  closing: i === 0 ? "[SAMPLE] That is your quick update." : null, cta: i === 0 ? "Follow FX Broker Updates for daily news." : null,
  duration_seconds: d as number, language: lang as string, related_article_id: null, publish_date: new Date().toISOString().slice(0, 10),
  published_at: hoursAgo(i), is_featured: i === 0, access_level: i === 0 ? "public" : "members", copy_enabled: true, is_sample: true,
}));
