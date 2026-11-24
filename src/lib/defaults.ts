/**
 * Default website configuration. Mirrors supabase/migrations/*_defaults_storage.sql.
 * Used when Supabase is not configured yet (development preview) and as a
 * fallback for any missing setting.
 */
import type { Category, FooterSection, NavItem, SocialLink } from "@/types/db";

export const DEFAULT_SETTINGS = {
  "site.general": {
    name: "FX Broker Updates",
    tagline: "Your Trusted Source for Global Broker News",
    domain: "www.fxbrokerupdates.com",
    contact_email: "contact@fxbrokerupdates.com",
    logo_url: "/images/logo.png",
    default_language: "en",
    default_timezone: "Asia/Karachi",
  },
  "site.theme": {
    deep_navy: "#06182D", dark_navy: "#031222", secondary_navy: "#102A46", royal_navy: "#153B60",
    primary_gold: "#F5C542", bright_gold: "#FFCC33", light_bg: "#F4F7FB", muted_text: "#A8B8CA",
  },
  "site.registration": { enabled: true, require_email_verification: true, terms_version: "1.0" },
  "site.maintenance": { enabled: false, message: "We are upgrading FX Broker Updates. Please check back shortly." },
  "site.seo": {
    default_title: "FX Broker Updates — Latest Broker Updates & Trading Market News",
    default_description:
      "Global Forex broker news, promotions, regulatory updates, trading market news and free daily AI banner prompts and video scripts.",
    og_image: "/images/hero-markets.webp",
    twitter_handle: "",
  },
  "site.footer": {
    description:
      "Independent financial news, global broker updates, market insights and free resources for traders, IBs and content creators.",
    newsletter_title: "Stay Ahead of the Market",
    newsletter_text: "Get the latest broker news, trading updates and free daily content in your inbox.",
    advertise_title: "Advertise With Us",
    advertise_text: "Promote your broker, product or campaign.",
    risk_disclaimer:
      "Trading Forex and CFDs involves significant risk. All information published on FX Broker Updates is for informational and educational purposes only and does not constitute financial advice.",
    copyright_name: "FX Broker Updates",
  },
  "site.legal": {
    about:
      "FX Broker Updates is an independent financial media platform covering global Forex broker news, trading market updates and free daily content tools for traders, Introducing Brokers, affiliates and financial content creators.\n\nWe are not a broker, trading platform or signal provider. We do not hold client funds, execute trades or provide investment advice.",
    privacy:
      "This policy explains what we collect and why.\n\n## Account data\nName, email, phone (optional), country and profession you provide at registration.\n\n## First-party analytics\nWe record page views, feature usage (for example opening an article, copying a prompt) and estimated active time on FX Broker Updates only. We do not record keystrokes, clipboard contents, form inputs, screen recordings or activity outside this website, and we do not store raw IP addresses. Country is derived from our hosting provider and stored as a two-letter code. Raw events are deleted after the configured retention period (default 90 days); anonymous aggregates may be kept longer.\n\n## Your choices\nYou can decline optional analytics for anonymous browsing, manage marketing consent, export your data and request account deletion from your account settings.",
    terms:
      "By using FX Broker Updates you agree to use the content for lawful purposes. Content is provided for information only and is not financial advice. Generated AI content must be reviewed by you before publication.",
    disclaimer:
      "Trading Forex, CFDs and cryptocurrencies involves significant risk and may not be suitable for all investors. FX Broker Updates does not provide investment advice. Broker information, promotions and regulatory details may change; always verify with the broker and the relevant regulator.",
    advertise: "Reach traders, Introducing Brokers and financial professionals. Sponsored placements are always clearly labelled.",
  },
  "analytics.tracking": {
    enabled: true, heartbeat_seconds: 45, idle_seconds: 120, offline_seconds: 150,
    anonymous_requires_consent: true, retention_days: 90,
  },
  "content.access": { guest_preview: true },
};

export type SettingsMap = typeof DEFAULT_SETTINGS;

export const DEFAULT_HOMEPAGE = {
  hero: {
    badge: "Global Broker News & Market Updates",
    title_line1: "Latest Broker Updates &",
    title_line2: "Trading Market News",
    subtitle: "Your trusted source for global broker announcements, promotions, platform updates, and live market highlights.",
    primary_label: "Explore Updates",
    primary_href: "/news",
    secondary_label: "Get Daily Free Tools",
    secondary_href: "/free-tools",
    image_url: "/images/hero-markets.webp",
    chips: [
      { label: "Broker News", icon: "shield-check", href: "/broker-updates" },
      { label: "Trading Updates", icon: "bar-chart", href: "/trading-updates" },
      { label: "Promotions", icon: "gift", href: "/category/promotions-bonuses" },
      { label: "Regulatory Alerts", icon: "bell", href: "/category/regulatory-updates" },
    ],
  },
  social_cards: {
    cards: [
      { key: "facebook", title: "Facebook", description: "Join our Facebook Community for latest updates.", href: "https://www.facebook.com/", visible: true, external: true },
      { key: "dott_plus", title: "Download Dott Plus", description: "Get Free Courses & Signals for Smarter Trading.", href: "https://example.com/dott-plus", visible: true, external: true, image_url: "/images/dott-plus.png" },
      { key: "linkedin", title: "LinkedIn", description: "Follow us on LinkedIn for professional updates.", href: "https://www.linkedin.com/", visible: true, external: true },
    ],
  },
  daily_tools: {
    cards: [
      { key: "banner", title_line1: "Get Your Daily Free", title_line2: "Banner Prompt", description: "AI prompts for professional trading banners.", href: "/free-tools/banner-prompts", image_url: "/images/banner-prompt.png" },
      { key: "video", title_line1: "Get Your Daily", title_line2: "Video Script", description: "Ready-to-use video scripts for trading & broker news.", href: "/free-tools/video-scripts", image_url: "/images/video-script.png" },
    ],
  },
  news_bar: { label: "Click Here to Get All News Updates", href: "/news" },
  todays_updates: {
    broker_title_plain: "Today's", broker_title_gold: "Broker Updates",
    trading_title_plain: "Today's", trading_title_gold: "Trading Updates",
    items_per_panel: 3,
  },
  categories: {},
  advertisement: {},
};

export type HomepageContent = typeof DEFAULT_HOMEPAGE;
export type HomepageKey = keyof HomepageContent;

export const DEFAULT_VISIBILITY: Record<HomepageKey, boolean> = {
  hero: true, social_cards: true, daily_tools: true, news_bar: true, todays_updates: true, categories: true, advertisement: true,
};

const navId = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
let navSeq = 100;
const child = (parent: number, label: string, href: string): NavItem => ({
  id: `nav-${navSeq++}`, parent_id: navId(parent), label, href, sort_order: navSeq, is_visible: true,
});

export const DEFAULT_NAV: NavItem[] = [
  { id: navId(1), parent_id: null, label: "Home", href: "/", sort_order: 10, is_visible: true },
  { id: navId(2), parent_id: null, label: "Broker Updates", href: "/broker-updates", sort_order: 20, is_visible: true },
  { id: navId(3), parent_id: null, label: "Trading Updates", href: "/trading-updates", sort_order: 30, is_visible: true },
  { id: navId(4), parent_id: null, label: "Free Tools", href: "/free-tools", sort_order: 40, is_visible: true },
  { id: navId(5), parent_id: null, label: "Broker Reviews", href: "/brokers", sort_order: 50, is_visible: true },
  { id: navId(6), parent_id: null, label: "About", href: "/about", sort_order: 60, is_visible: true },
  child(2, "All Broker News", "/broker-updates"),
  child(2, "Promotions & Bonuses", "/category/promotions-bonuses"),
  child(2, "Regulatory Updates", "/category/regulatory-updates"),
  child(2, "IB & Affiliate", "/category/ib-affiliate"),
  child(2, "Scam Alerts", "/category/scam-alerts"),
  child(3, "All Market News", "/trading-updates"),
  child(3, "Gold", "/trading-updates?market=gold"),
  child(3, "Forex", "/trading-updates?market=forex"),
  child(3, "Crypto", "/trading-updates?market=crypto"),
  child(3, "Central Banks", "/trading-updates?market=central_banks"),
  child(4, "Daily Banner Prompts", "/free-tools/banner-prompts"),
  child(4, "Daily Video Scripts", "/free-tools/video-scripts"),
  child(4, "AI Creator Studio", "/dashboard/studio"),
];

export const DEFAULT_FOOTER: FooterSection[] = [
  {
    id: "f1", column_key: "quick_links", title: "Quick Links", sort_order: 10, is_visible: true,
    items: [
      { label: "Home", href: "/" }, { label: "About Us", href: "/about" }, { label: "Broker Updates", href: "/broker-updates" },
      { label: "Trading Updates", href: "/trading-updates" }, { label: "Broker Reviews", href: "/brokers" }, { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    id: "f2", column_key: "news_insights", title: "News & Insights", sort_order: 20, is_visible: true,
    items: [
      { label: "Broker News", href: "/category/broker-news" }, { label: "Market News", href: "/trading-updates" },
      { label: "Promotions & Bonuses", href: "/category/promotions-bonuses" }, { label: "Regulatory Updates", href: "/category/regulatory-updates" },
      { label: "IB & Partnerships", href: "/category/ib-affiliate" }, { label: "Market Analysis", href: "/trading-updates?market=market_analysis" },
    ],
  },
  {
    id: "f3", column_key: "free_resources", title: "Free Resources", sort_order: 30, is_visible: true,
    items: [
      { label: "Daily Banner Prompts", href: "/free-tools/banner-prompts" }, { label: "Daily Video Scripts", href: "/free-tools/video-scripts" },
      { label: "AI Creator Studio", href: "/dashboard/studio" }, { label: "Download Dott Plus", href: "https://example.com/dott-plus", external: true },
      { label: "Tools & Templates", href: "/free-tools", flag: "tools_templates" },
    ],
  },
];

export const DEFAULT_SOCIAL: SocialLink[] = [
  { id: "s1", platform: "facebook", label: "Facebook", url: "https://www.facebook.com/", show_in_footer: true, sort_order: 10, is_visible: true },
  { id: "s2", platform: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/", show_in_footer: true, sort_order: 20, is_visible: true },
  { id: "s3", platform: "instagram", label: "Instagram", url: "https://www.instagram.com/", show_in_footer: true, sort_order: 30, is_visible: true },
  { id: "s4", platform: "youtube", label: "YouTube", url: "https://www.youtube.com/", show_in_footer: true, sort_order: 40, is_visible: true },
  { id: "s5", platform: "telegram", label: "Telegram", url: "https://t.me/", show_in_footer: true, sort_order: 50, is_visible: true },
];

const cat = (slug: string, name: string, news_type: Category["news_type"], icon: string, sort: number, home: boolean, desc: string | null): Category => ({
  id: `cat-${slug}`, slug, name, description: null, news_type, icon, sort_order: sort, show_on_home: home, home_description: desc, is_active: true,
});

export const DEFAULT_CATEGORIES: Category[] = [
  cat("broker-news", "Broker News", "broker", "megaphone", 10, true, "Latest announcements from global brokers"),
  cat("promotions-bonuses", "Promotions & Bonuses", "broker", "gift", 20, true, "Ongoing offers, deposit bonuses and campaigns"),
  cat("regulatory-updates", "Regulatory Updates", "broker", "shield-check", 30, true, "Licenses, compliance and official alerts"),
  cat("broker-reviews", "Broker Reviews", "broker", "scale", 40, true, "In-depth reviews, spreads and key comparisons"),
  cat("ib-affiliate", "IB & Affiliate", "broker", "users", 50, true, "IB programs, commissions and partnership updates"),
  cat("scam-alerts", "Scam Alerts", "broker", "bell", 60, true, "Stay informed about suspicious brokers"),
  cat("broker-announcements", "Broker Announcements", "broker", "newspaper", 70, false, null),
  cat("broker-partnerships", "Broker Partnerships", "broker", "handshake", 80, false, null),
  cat("trading-volume-reports", "Trading Volume Reports", "broker", "bar-chart", 90, false, null),
  cat("broker-events", "Broker Events", "broker", "calendar", 100, false, null),
  cat("new-trading-products", "New Trading Products", "broker", "package", 110, false, null),
  cat("platform-updates", "Platform Updates", "broker", "monitor", 120, false, null),
  cat("deposit-withdrawal", "Deposit & Withdrawal Updates", "broker", "wallet", 130, false, null),
  cat("broker-expansions", "Broker Expansions", "broker", "globe", 140, false, null),
  cat("executive-appointments", "Executive Appointments", "broker", "user-check", 150, false, null),
  cat("corporate-acquisitions", "Corporate Acquisitions", "broker", "building", 160, false, null),
  cat("broker-awards", "Broker Awards", "broker", "award", 170, false, null),
  cat("technology-updates", "Technology Updates", "broker", "cpu", 180, false, null),
  cat("market-news", "Market News", "trading", "trending-up", 200, false, null),
  cat("market-analysis", "Market Analysis", "trading", "line-chart", 210, false, null),
];

export const DEFAULT_FLAGS: Record<string, boolean> = {
  banner_prompts: true, video_scripts: true, ai_studio: true, broker_directory: true, user_reviews: false,
  newsletter: true, notifications: true, advertisements: true, tools_templates: false, pwa: true, registration: true,
};

export const MARKETS = [
  { value: "gold", label: "Gold" }, { value: "forex", label: "Forex" }, { value: "crypto", label: "Crypto" },
  { value: "global_economy", label: "Global Economy" }, { value: "central_banks", label: "Central Banks" },
  { value: "geopolitics", label: "Geopolitics" }, { value: "us_economy", label: "US Economy" },
  { value: "stock_markets", label: "Stock Markets" }, { value: "commodities", label: "Commodities" },
  { value: "oil", label: "Oil" }, { value: "economic_data", label: "Economic Data" }, { value: "market_analysis", label: "Market Analysis" },
] as const;

export const PROFESSIONS = [
  { value: "trader", label: "Trader" }, { value: "introducing_broker", label: "Introducing Broker" },
  { value: "broker_employee", label: "Broker Employee" }, { value: "affiliate_partner", label: "Affiliate Partner" },
  { value: "content_creator", label: "Content Creator" }, { value: "financial_analyst", label: "Financial Analyst" },
  { value: "business_owner", label: "Business Owner" }, { value: "other", label: "Other" },
] as const;

export const PROMPT_CATEGORIES = [
  { value: "broker_news", label: "Broker News" }, { value: "trading_news", label: "Trading News" }, { value: "gold", label: "Gold" },
  { value: "forex", label: "Forex" }, { value: "crypto", label: "Crypto" }, { value: "market_events", label: "Market Events" },
  { value: "broker_promotions", label: "Broker Promotions" }, { value: "financial_education", label: "Financial Education" },
  { value: "economic_news", label: "Economic News" },
] as const;

export const LANGUAGES = [
  { value: "en", label: "English" }, { value: "ur", label: "Urdu" }, { value: "roman_ur", label: "Roman Urdu" },
  { value: "hi", label: "Hindi" }, { value: "ar", label: "Arabic" },
] as const;

export const ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9"] as const;
export const DURATIONS = [15, 30, 40, 60, 90, 120] as const;

export const labelOf = (list: readonly { value: string; label: string }[], v: string | null | undefined) =>
  list.find((x) => x.value === v)?.label ?? (v ? v.replace(/_/g, " ") : "—");
