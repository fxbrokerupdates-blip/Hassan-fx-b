/**
 * Declarative admin CMS resources. Each entry drives a list page, an edit form,
 * server-side validation and audit logging. Database RLS enforces the same
 * permissions independently.
 */
import { ASPECT_RATIOS, DURATIONS, LANGUAGES, MARKETS, PROMPT_CATEGORIES } from "@/lib/defaults";

export type FieldType =
  | "text" | "textarea" | "markdown" | "number" | "select" | "boolean" | "datetime" | "date" | "url" | "image"
  | "tags" | "json" | "relation" | "slug" | "readonly" | "email";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly { value: string; label: string }[];
  relation?: { table: string; label: string; filter?: Record<string, string> };
  help?: string;
  max?: number;
  default?: string | number | boolean;
  slugFrom?: string;
  section?: string;
  wide?: boolean;
}

export interface Resource {
  key: string;
  table: string;
  title: string;
  singular: string;
  permission: string;
  deletePermission?: string;
  fields: Field[];
  list: { name: string; label: string; kind?: "badge" | "date" | "bool" | "relation" | "text" }[];
  search?: string[];
  filters?: { name: string; label: string; options: readonly { value: string; label: string }[] }[];
  order: { column: string; ascending?: boolean };
  rowLabel: string;
  canCreate?: boolean;
  canDelete?: boolean;
  bulkStatus?: { field: string; values: readonly { value: string; label: string }[] };
  select?: string;
  description?: string;
}

const opts = (...v: string[]) => v.map((x) => ({ value: x, label: x.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));
const STATUS_CONTENT = opts("draft", "scheduled", "published", "archived");
const NEWS_STATUS = opts("draft", "pending_review", "scheduled", "published", "archived", "rejected");
const INBOX_STATUS = opts("new", "in_progress", "replied", "resolved", "archived");

export const RESOURCES: Record<string, Resource> = {
  news: {
    key: "news", table: "news_articles", title: "News Articles", singular: "Article", permission: "news.edit", deletePermission: "news.delete",
    description: "Broker and trading news CMS. Publishing, scheduling and unpublishing require the news.publish permission.",
    select: "id,title,news_type,status,priority,published_at,scheduled_at,is_featured,is_sample,updated_at,category:news_categories(name),broker:brokers(name)",
    fields: [
      { name: "news_type", label: "News type", type: "select", required: true, options: opts("broker", "trading"), section: "Basics" },
      { name: "title", label: "Headline", type: "text", required: true, max: 300, wide: true, section: "Basics" },
      { name: "slug", label: "URL slug", type: "slug", slugFrom: "title", help: "Leave empty to generate from the headline", section: "Basics" },
      { name: "summary", label: "Editorial summary", type: "textarea", max: 2000, wide: true, section: "Content" },
      { name: "content", label: "Original editorial content", type: "markdown", wide: true, help: "Write original content. Never paste complete copyrighted articles. Supports ## headings, - lists, **bold**.", section: "Content" },
      { name: "content_origin", label: "Content origin", type: "select", default: "original", options: [{ value: "original", label: "Original editorial" }, { value: "ai_assisted", label: "AI-assisted (reviewed)" }, { value: "source_excerpt", label: "Short source excerpt" }], section: "Content" },
      { name: "key_highlights", label: "Key highlights", type: "tags", help: "Separate with | (pipe)", wide: true, section: "Content" },
      { name: "featured_image_url", label: "Featured image", type: "image", section: "Content" },
      { name: "category_id", label: "Category", type: "relation", relation: { table: "news_categories", label: "name" }, section: "Classification" },
      { name: "broker_id", label: "Broker", type: "relation", relation: { table: "brokers", label: "name" }, section: "Classification" },
      { name: "market", label: "Market", type: "select", options: [...MARKETS, { value: "other", label: "Other" }], section: "Classification" },
      { name: "market_impact", label: "Market impact", type: "select", options: opts("high", "medium", "low"), section: "Classification" },
      { name: "priority", label: "Priority", type: "select", required: true, options: [{ value: "hot", label: "HOT" }, { value: "warm", label: "WARM" }, { value: "normal", label: "NORMAL" }], help: "HOT only for significant, time-sensitive verified updates", section: "Classification" },
      { name: "country", label: "Country code", type: "text", max: 2, section: "Classification" },
      { name: "_tags", label: "Tags", type: "tags", help: "Comma-separated", section: "Classification" },
      { name: "source_name", label: "Source name", type: "text", max: 120, section: "Source" },
      { name: "original_url", label: "Original source URL", type: "url", section: "Source" },
      { name: "original_published_at", label: "Original publication time (UTC)", type: "datetime", section: "Source" },
      { name: "author_name", label: "Author", type: "text", max: 120, section: "Source" },
      { name: "status", label: "Status", type: "select", required: true, options: NEWS_STATUS, section: "Publishing" },
      { name: "scheduled_at", label: "Schedule for (UTC)", type: "datetime", section: "Publishing" },
      { name: "needs_review_reason", label: "Review note", type: "text", section: "Publishing" },
      { name: "is_featured", label: "Featured", type: "boolean", section: "Publishing" },
      { name: "show_on_home", label: "Show on homepage", type: "boolean", default: true, section: "Publishing" },
      { name: "reading_minutes", label: "Reading time (min)", type: "number", section: "Publishing" },
      { name: "seo_title", label: "SEO title", type: "text", max: 70, section: "SEO" },
      { name: "seo_description", label: "Meta description", type: "textarea", max: 170, section: "SEO" },
      { name: "canonical_url", label: "Canonical URL", type: "url", section: "SEO" },
      { name: "noindex", label: "Hide from search engines (noindex)", type: "boolean", section: "SEO" },
    ],
    list: [
      { name: "title", label: "Headline" }, { name: "news_type", label: "Type", kind: "badge" }, { name: "status", label: "Status", kind: "badge" },
      { name: "priority", label: "Priority", kind: "badge" }, { name: "category", label: "Category", kind: "relation" }, { name: "broker", label: "Broker", kind: "relation" },
      { name: "published_at", label: "Published", kind: "date" },
    ],
    search: ["title"],
    filters: [
      { name: "news_type", label: "Type", options: opts("broker", "trading") },
      { name: "status", label: "Status", options: NEWS_STATUS },
      { name: "priority", label: "Priority", options: opts("hot", "warm", "normal") },
      { name: "market", label: "Market", options: MARKETS },
    ],
    order: { column: "updated_at" }, rowLabel: "title",
    bulkStatus: { field: "status", values: opts("published", "draft", "archived", "rejected") },
  },
  categories: {
    key: "categories", table: "news_categories", title: "News Categories", singular: "Category", permission: "news.edit",
    fields: [
      { name: "name", label: "Name", type: "text", required: true }, { name: "slug", label: "Slug", type: "slug", slugFrom: "name" },
      { name: "news_type", label: "Applies to", type: "select", options: opts("broker", "trading", "both"), required: true },
      { name: "icon", label: "Icon", type: "select", default: "newspaper", options: opts("megaphone", "gift", "shield-check", "scale", "users", "bell", "newspaper", "handshake", "bar-chart", "calendar", "package", "monitor", "wallet", "globe", "user-check", "building", "award", "cpu", "trending-up", "line-chart") },
      { name: "description", label: "Description", type: "textarea" },
      { name: "show_on_home", label: "Show as homepage card", type: "boolean" }, { name: "home_description", label: "Homepage card text", type: "text", max: 80 },
      { name: "sort_order", label: "Sort order", type: "number", default: 100 }, { name: "is_active", label: "Active", type: "boolean", default: true },
      { name: "seo_title", label: "SEO title", type: "text" }, { name: "seo_description", label: "Meta description", type: "textarea" },
    ],
    list: [{ name: "name", label: "Name" }, { name: "slug", label: "Slug" }, { name: "news_type", label: "Type", kind: "badge" }, { name: "show_on_home", label: "Home", kind: "bool" }, { name: "is_active", label: "Active", kind: "bool" }, { name: "sort_order", label: "Order" }],
    search: ["name"], order: { column: "sort_order", ascending: true }, rowLabel: "name",
  },
  brokers: {
    key: "brokers", table: "brokers", title: "Broker Directory", singular: "Broker", permission: "brokers.manage",
    description: "Only add information you can verify. Regulatory claims require a source link (see Regulations).",
    fields: [
      { name: "name", label: "Broker name", type: "text", required: true, section: "Profile" }, { name: "slug", label: "Slug", type: "slug", slugFrom: "name", section: "Profile" },
      { name: "logo_url", label: "Logo", type: "image", section: "Profile" }, { name: "website_url", label: "Official website", type: "url", section: "Profile" },
      { name: "short_description", label: "Short description", type: "textarea", max: 300, section: "Profile" },
      { name: "founded_year", label: "Founding year", type: "number", section: "Details" }, { name: "headquarters", label: "Headquarters", type: "text", section: "Details" },
      { name: "countries_served", label: "Countries served", type: "tags", section: "Details" }, { name: "platforms", label: "Trading platforms", type: "tags", section: "Details" },
      { name: "account_types", label: "Account types", type: "tags", section: "Details" }, { name: "min_deposit", label: "Minimum deposit", type: "text", section: "Details" },
      { name: "instruments", label: "Instruments", type: "tags", section: "Details" }, { name: "payment_methods", label: "Deposit & withdrawal methods", type: "tags", section: "Details" },
      { name: "social_links", label: "Official social links (JSON)", type: "json", help: '{"facebook":"https://…","linkedin":"https://…"}', section: "Details" },
      { name: "editorial_review", label: "Editorial review", type: "markdown", wide: true, section: "Review" },
      { name: "is_featured", label: "Featured", type: "boolean", section: "Placement" }, { name: "is_sponsored", label: "Sponsored placement (labelled publicly)", type: "boolean", section: "Placement" },
      { name: "affiliate_disclosure", label: "Affiliate disclosure", type: "textarea", section: "Placement" },
      { name: "last_verified_at", label: "Last verification (UTC)", type: "datetime", section: "Placement" },
      { name: "status", label: "Status", type: "select", default: "active", options: opts("active", "archived"), section: "Placement" },
      { name: "seo_title", label: "SEO title", type: "text", section: "SEO" }, { name: "seo_description", label: "Meta description", type: "textarea", section: "SEO" },
    ],
    list: [{ name: "name", label: "Name" }, { name: "status", label: "Status", kind: "badge" }, { name: "is_featured", label: "Featured", kind: "bool" }, { name: "is_sponsored", label: "Sponsored", kind: "bool" }, { name: "last_verified_at", label: "Verified", kind: "date" }],
    search: ["name"], filters: [{ name: "status", label: "Status", options: opts("active", "archived") }],
    order: { column: "name", ascending: true }, rowLabel: "name", bulkStatus: { field: "status", values: opts("active", "archived") },
  },
  regulations: {
    key: "regulations", table: "broker_regulations", title: "Broker Regulations", singular: "License", permission: "brokers.manage",
    description: "Every license entry must link to the regulator’s official register or another verifiable source.",
    select: "id,regulator,license_number,jurisdiction,status,verified_at,broker:brokers(name)",
    fields: [
      { name: "broker_id", label: "Broker", type: "relation", relation: { table: "brokers", label: "name" }, required: true },
      { name: "regulator", label: "Regulator", type: "text", required: true }, { name: "license_number", label: "License number", type: "text" },
      { name: "jurisdiction", label: "Jurisdiction", type: "text" }, { name: "status", label: "Status", type: "select", options: opts("verified", "unverified", "revoked", "expired"), required: true },
      { name: "verification_url", label: "Verification source URL", type: "url", required: true }, { name: "verified_at", label: "Verified at (UTC)", type: "datetime" },
    ],
    list: [{ name: "broker", label: "Broker", kind: "relation" }, { name: "regulator", label: "Regulator" }, { name: "license_number", label: "License" }, { name: "status", label: "Status", kind: "badge" }, { name: "verified_at", label: "Verified", kind: "date" }],
    search: ["regulator", "license_number"], order: { column: "created_at" }, rowLabel: "regulator",
  },
  promotions: {
    key: "promotions", table: "broker_promotions", title: "Broker Promotions", singular: "Promotion", permission: "brokers.manage",
    select: "id,title,status,is_verified,starts_at,ends_at,broker:brokers(name)",
    fields: [
      { name: "broker_id", label: "Broker", type: "relation", relation: { table: "brokers", label: "name" }, required: true },
      { name: "title", label: "Title", type: "text", required: true }, { name: "description", label: "Description", type: "textarea" },
      { name: "terms_url", label: "Terms URL", type: "url" }, { name: "source_url", label: "Source URL", type: "url" },
      { name: "starts_at", label: "Starts (UTC)", type: "datetime" }, { name: "ends_at", label: "Ends (UTC)", type: "datetime" },
      { name: "is_verified", label: "Verified with broker", type: "boolean" }, { name: "status", label: "Status", type: "select", default: "draft", options: opts("draft", "active", "expired", "archived") },
    ],
    list: [{ name: "broker", label: "Broker", kind: "relation" }, { name: "title", label: "Title" }, { name: "status", label: "Status", kind: "badge" }, { name: "is_verified", label: "Verified", kind: "bool" }, { name: "ends_at", label: "Ends", kind: "date" }],
    search: ["title"], order: { column: "created_at" }, rowLabel: "title",
  },
  reviews: {
    key: "reviews", table: "broker_reviews", title: "Broker Reviews", singular: "Review", permission: "brokers.manage",
    select: "id,title,review_type,status,rating,created_at,broker:brokers(name)",
    fields: [
      { name: "broker_id", label: "Broker", type: "relation", relation: { table: "brokers", label: "name" }, required: true },
      { name: "review_type", label: "Type", type: "select", options: [{ value: "editorial", label: "Editorial" }, { value: "user", label: "User" }, { value: "sponsored", label: "Sponsored (labelled)" }], required: true },
      { name: "title", label: "Title", type: "text", required: true }, { name: "body", label: "Body", type: "markdown", required: true, wide: true },
      { name: "rating", label: "Rating (1–5, optional)", type: "number", help: "Leave empty unless based on a documented methodology" },
      { name: "status", label: "Status", type: "select", default: "pending", options: opts("pending", "approved", "rejected") },
    ],
    list: [{ name: "broker", label: "Broker", kind: "relation" }, { name: "title", label: "Title" }, { name: "review_type", label: "Type", kind: "badge" }, { name: "status", label: "Status", kind: "badge" }, { name: "created_at", label: "Created", kind: "date" }],
    filters: [{ name: "review_type", label: "Type", options: opts("editorial", "user", "sponsored") }, { name: "status", label: "Status", options: opts("pending", "approved", "rejected") }],
    search: ["title"], order: { column: "created_at" }, rowLabel: "title", bulkStatus: { field: "status", values: opts("approved", "rejected") },
  },
  prompts: {
    key: "prompts", table: "banner_prompts", title: "Banner Prompts", singular: "Banner Prompt", permission: "prompts.manage",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, wide: true }, { name: "prompt_text", label: "Prompt text", type: "textarea", required: true, wide: true, max: 8000 },
      { name: "preview_image_url", label: "Preview image", type: "image" },
      { name: "category", label: "Category", type: "select", options: PROMPT_CATEGORIES, required: true },
      { name: "aspect_ratio", label: "Aspect ratio", type: "select", options: ASPECT_RATIOS.map((a) => ({ value: a, label: a })), required: true },
      { name: "language", label: "Language", type: "select", options: LANGUAGES, required: true }, { name: "tags", label: "Tags", type: "tags" },
      { name: "related_article_id", label: "Related news", type: "relation", relation: { table: "news_articles", label: "title", filter: { status: "published" } } },
      { name: "publish_date", label: "Publication date", type: "date", required: true }, { name: "status", label: "Status", type: "select", options: STATUS_CONTENT, required: true },
      { name: "scheduled_at", label: "Schedule for (UTC)", type: "datetime" }, { name: "is_featured", label: "Featured", type: "boolean" },
      { name: "access_level", label: "Access", type: "select", default: "members", options: [{ value: "members", label: "Members only (guests see preview)" }, { value: "public", label: "Public" }] },
      { name: "copy_enabled", label: "Copying enabled", type: "boolean", default: true },
    ],
    list: [{ name: "title", label: "Title" }, { name: "category", label: "Category", kind: "badge" }, { name: "aspect_ratio", label: "Ratio" }, { name: "language", label: "Lang" }, { name: "status", label: "Status", kind: "badge" }, { name: "publish_date", label: "Date", kind: "date" }],
    search: ["title"], filters: [{ name: "status", label: "Status", options: STATUS_CONTENT }, { name: "category", label: "Category", options: PROMPT_CATEGORIES }, { name: "language", label: "Language", options: LANGUAGES }],
    order: { column: "publish_date" }, rowLabel: "title", bulkStatus: { field: "status", values: opts("published", "draft", "archived") },
  },
  scripts: {
    key: "scripts", table: "video_scripts", title: "Video Scripts", singular: "Video Script", permission: "scripts.manage",
    fields: [
      { name: "title", label: "Video title", type: "text", required: true, wide: true }, { name: "topic", label: "Topic", type: "text" },
      { name: "hook", label: "Hook", type: "textarea", required: true, wide: true }, { name: "body", label: "Main script", type: "textarea", required: true, wide: true },
      { name: "closing", label: "Closing statement", type: "textarea", wide: true }, { name: "cta", label: "Call to action (optional)", type: "text", wide: true },
      { name: "duration_seconds", label: "Duration", type: "select", options: DURATIONS.map((d) => ({ value: String(d), label: d >= 120 ? `${d / 60} minutes` : `${d} seconds` })), required: true },
      { name: "language", label: "Language", type: "select", options: LANGUAGES, required: true },
      { name: "related_article_id", label: "Related news", type: "relation", relation: { table: "news_articles", label: "title", filter: { status: "published" } } },
      { name: "publish_date", label: "Publication date", type: "date", required: true }, { name: "status", label: "Status", type: "select", options: STATUS_CONTENT, required: true },
      { name: "scheduled_at", label: "Schedule for (UTC)", type: "datetime" }, { name: "is_featured", label: "Featured", type: "boolean" },
      { name: "access_level", label: "Access", type: "select", default: "members", options: [{ value: "members", label: "Members only (guests see hook)" }, { value: "public", label: "Public" }] },
      { name: "copy_enabled", label: "Copying enabled", type: "boolean", default: true },
    ],
    list: [{ name: "title", label: "Title" }, { name: "duration_seconds", label: "Sec" }, { name: "language", label: "Lang" }, { name: "status", label: "Status", kind: "badge" }, { name: "publish_date", label: "Date", kind: "date" }],
    search: ["title"], filters: [{ name: "status", label: "Status", options: STATUS_CONTENT }, { name: "language", label: "Language", options: LANGUAGES }],
    order: { column: "publish_date" }, rowLabel: "title", bulkStatus: { field: "status", values: opts("published", "draft", "archived") },
  },
  sources: {
    key: "sources", table: "news_sources", title: "News Sources", singular: "Source", permission: "sources.manage",
    description: "Only add feeds/APIs whose terms permit automated collection. Untrusted sources always go to editorial review.",
    fields: [
      { name: "name", label: "Source name", type: "text", required: true }, { name: "website_url", label: "Website URL", type: "url" },
      { name: "feed_url", label: "Feed / API URL (https)", type: "url", required: true },
      { name: "source_type", label: "Source type", type: "select", required: true, options: opts("broker_rss", "broker_press", "financial_rss", "news_api", "regulator", "central_bank", "institution", "licensed_data", "public") },
      { name: "news_type", label: "News type", type: "select", options: opts("broker", "trading"), required: true },
      { name: "category_id", label: "Default category", type: "relation", relation: { table: "news_categories", label: "name" } },
      { name: "broker_id", label: "Broker mapping", type: "relation", relation: { table: "brokers", label: "name" } },
      { name: "language", label: "Language", type: "text", default: "en" }, { name: "country", label: "Country", type: "text", max: 2 },
      { name: "priority", label: "Priority (0–100)", type: "number", default: 50 }, { name: "refresh_minutes", label: "Refresh every (minutes, ≥2)", type: "number", default: 15 },
      { name: "collection_permitted", label: "I confirm automated collection is permitted for this source", type: "boolean" },
      { name: "enabled", label: "Enabled", type: "boolean" }, { name: "trusted", label: "Trusted source", type: "boolean" },
      { name: "auto_publish", label: "Auto-publish (trusted sources only; high-risk items still go to review)", type: "boolean" },
    ],
    list: [{ name: "name", label: "Name" }, { name: "source_type", label: "Type", kind: "badge" }, { name: "enabled", label: "On", kind: "bool" }, { name: "trusted", label: "Trusted", kind: "bool" },
      { name: "last_success_at", label: "Last success", kind: "date" }, { name: "error_count", label: "Errors" }, { name: "articles_collected", label: "Collected" }],
    search: ["name"], order: { column: "priority" }, rowLabel: "name",
  },
  ads: {
    key: "ads", table: "advertisements", title: "Advertisements", singular: "Advertisement", permission: "ads.manage",
    description: "Sponsored placements are always labelled. Never present paid placement as independent editorial ranking.",
    fields: [
      { name: "advertiser", label: "Advertiser", type: "text", required: true }, { name: "campaign_name", label: "Campaign name", type: "text", required: true },
      { name: "image_url", label: "Creative image", type: "image" }, { name: "headline", label: "Text headline (if no image)", type: "text" },
      { name: "destination_url", label: "Destination link", type: "url", required: true },
      { name: "placement", label: "Placement", type: "select", required: true, options: opts("home_banner", "news_listing", "article_page", "member_dashboard", "sponsored_broker", "sponsored_article", "featured_broker") },
      { name: "is_affiliate", label: "Affiliate relationship", type: "boolean" },
      { name: "starts_at", label: "Start (UTC)", type: "datetime", required: true }, { name: "ends_at", label: "End (UTC)", type: "datetime" },
      { name: "is_active", label: "Active", type: "boolean" }, { name: "impressions", label: "Impressions", type: "readonly" }, { name: "clicks", label: "Clicks", type: "readonly" },
    ],
    list: [{ name: "campaign_name", label: "Campaign" }, { name: "advertiser", label: "Advertiser" }, { name: "placement", label: "Placement", kind: "badge" }, { name: "is_active", label: "Active", kind: "bool" },
      { name: "impressions", label: "Impr." }, { name: "clicks", label: "Clicks" }, { name: "ends_at", label: "Ends", kind: "date" }],
    search: ["campaign_name", "advertiser"], order: { column: "created_at" }, rowLabel: "campaign_name",
  },
  social: {
    key: "social", table: "social_links", title: "Social Links", singular: "Social link", permission: "homepage.manage",
    fields: [
      { name: "platform", label: "Platform", type: "select", required: true, options: opts("facebook", "linkedin", "instagram", "youtube", "telegram", "x", "tiktok", "whatsapp") },
      { name: "label", label: "Label", type: "text", required: true }, { name: "url", label: "URL", type: "url", required: true },
      { name: "show_in_footer", label: "Show in footer", type: "boolean", default: true }, { name: "is_visible", label: "Visible", type: "boolean", default: true }, { name: "sort_order", label: "Order", type: "number", default: 100 },
    ],
    list: [{ name: "platform", label: "Platform", kind: "badge" }, { name: "url", label: "URL" }, { name: "is_visible", label: "Visible", kind: "bool" }, { name: "sort_order", label: "Order" }],
    order: { column: "sort_order", ascending: true }, rowLabel: "label",
  },
  navigation: {
    key: "navigation", table: "navigation_items", title: "Header Navigation", singular: "Menu item", permission: "homepage.manage",
    fields: [
      { name: "label", label: "Label", type: "text", required: true }, { name: "href", label: "Link (/path or https://)", type: "text", required: true },
      { name: "parent_id", label: "Dropdown parent", type: "relation", relation: { table: "navigation_items", label: "label" } },
      { name: "sort_order", label: "Order", type: "number", default: 100 }, { name: "is_visible", label: "Visible", type: "boolean", default: true },
    ],
    list: [{ name: "label", label: "Label" }, { name: "href", label: "Link" }, { name: "parent_id", label: "Child", kind: "bool" }, { name: "is_visible", label: "Visible", kind: "bool" }, { name: "sort_order", label: "Order" }],
    order: { column: "sort_order", ascending: true }, rowLabel: "label",
  },
  footer: {
    key: "footer", table: "footer_sections", title: "Footer Columns", singular: "Footer column", permission: "homepage.manage",
    fields: [
      { name: "column_key", label: "Key", type: "text", required: true }, { name: "title", label: "Title", type: "text", required: true },
      { name: "items", label: "Links (JSON)", type: "json", wide: true, help: '[{"label":"Home","href":"/"},{"label":"Dott Plus","href":"https://…","external":true},{"label":"Tools","href":"/free-tools","flag":"tools_templates"}]' },
      { name: "sort_order", label: "Order", type: "number", default: 100 }, { name: "is_visible", label: "Visible", type: "boolean", default: true },
    ],
    list: [{ name: "title", label: "Title" }, { name: "column_key", label: "Key" }, { name: "is_visible", label: "Visible", kind: "bool" }, { name: "sort_order", label: "Order" }],
    order: { column: "sort_order", ascending: true }, rowLabel: "title",
  },
  templates: {
    key: "templates", table: "ai_templates", title: "AI Brand Templates", singular: "Template", permission: "ai.settings",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "content_type", label: "Applies to content type", type: "text", required: true, help: "Use 'any' for all types, or e.g. facebook_post" },
      { name: "instructions", label: "Instructions", type: "textarea", required: true, wide: true, max: 8000 },
      { name: "scope", label: "Used by", type: "select", default: "admin", options: opts("admin", "member", "both") }, { name: "is_active", label: "Active", type: "boolean", default: true },
    ],
    list: [{ name: "name", label: "Name" }, { name: "content_type", label: "Type" }, { name: "scope", label: "Scope", kind: "badge" }, { name: "is_active", label: "Active", kind: "bool" }],
    order: { column: "created_at" }, rowLabel: "name",
  },
  campaigns: {
    key: "campaigns", table: "newsletter_campaigns", title: "Newsletter Campaigns", singular: "Campaign", permission: "newsletter.manage",
    description: "Sending requires an email provider (EMAIL_PROVIDER). In development mode no real email is sent.",
    fields: [
      { name: "subject", label: "Subject", type: "text", required: true, wide: true }, { name: "preheader", label: "Preheader", type: "text", wide: true },
      { name: "body", label: "Body", type: "markdown", wide: true }, { name: "segment_id", label: "Audience segment", type: "relation", relation: { table: "user_segments", label: "name" } },
      { name: "scheduled_at", label: "Schedule (UTC)", type: "datetime" }, { name: "status", label: "Status", type: "select", default: "draft", options: opts("draft", "scheduled", "cancelled") },
      { name: "recipients", label: "Recipients", type: "readonly" }, { name: "sent_at", label: "Sent at", type: "readonly" },
    ],
    list: [{ name: "subject", label: "Subject" }, { name: "status", label: "Status", kind: "badge" }, { name: "scheduled_at", label: "Scheduled", kind: "date" }, { name: "recipients", label: "Recipients" }],
    order: { column: "created_at" }, rowLabel: "subject",
  },
  subscribers: {
    key: "subscribers", table: "newsletter_subscribers", title: "Newsletter Subscribers", singular: "Subscriber", permission: "newsletter.manage", canCreate: false,
    fields: [
      { name: "email", label: "Email", type: "readonly" }, { name: "status", label: "Status", type: "select", default: "subscribed", options: opts("pending", "subscribed", "unsubscribed") },
      { name: "consent_source", label: "Consent source", type: "readonly" }, { name: "consent_text", label: "Consent text", type: "readonly" }, { name: "consent_at", label: "Consent time", type: "readonly" },
    ],
    list: [{ name: "email", label: "Email" }, { name: "status", label: "Status", kind: "badge" }, { name: "consent_source", label: "Source" }, { name: "consent_at", label: "Consent", kind: "date" }],
    search: ["email"], filters: [{ name: "status", label: "Status", options: opts("pending", "subscribed", "unsubscribed") }],
    order: { column: "created_at" }, rowLabel: "email", bulkStatus: { field: "status", values: opts("unsubscribed") },
  },
  messages: {
    key: "messages", table: "contact_messages", title: "Contact & Support Inbox", singular: "Message", permission: "inbox.manage",
    canCreate: false,
    fields: [
      { name: "kind", label: "Kind", type: "readonly" }, { name: "name", label: "Name", type: "readonly" }, { name: "email", label: "Email", type: "readonly" },
      { name: "subject", label: "Subject", type: "readonly" }, { name: "message", label: "Message", type: "readonly", wide: true },
      { name: "status", label: "Status", type: "select", default: "new", options: INBOX_STATUS }, { name: "assigned_to", label: "Assigned to", type: "relation", relation: { table: "staff", label: "full_name" } },
      { name: "internal_notes", label: "Internal notes", type: "textarea", wide: true },
    ],
    list: [{ name: "subject", label: "Subject" }, { name: "kind", label: "Kind", kind: "badge" }, { name: "name", label: "From" }, { name: "status", label: "Status", kind: "badge" }, { name: "created_at", label: "Received", kind: "date" }],
    search: ["subject", "email", "name"], filters: [{ name: "status", label: "Status", options: INBOX_STATUS }, { name: "kind", label: "Kind", options: opts("contact", "support", "correction", "partnership") }],
    order: { column: "created_at" }, rowLabel: "subject", bulkStatus: { field: "status", values: INBOX_STATUS },
  },
  enquiries: {
    key: "enquiries", table: "advertising_enquiries", title: "Advertising Enquiries", singular: "Enquiry", permission: "inbox.manage", canCreate: false,
    fields: [
      { name: "company", label: "Company", type: "readonly" }, { name: "contact_name", label: "Contact", type: "readonly" }, { name: "email", label: "Email", type: "readonly" },
      { name: "website", label: "Website", type: "readonly" }, { name: "budget", label: "Budget", type: "readonly" }, { name: "message", label: "Message", type: "readonly", wide: true },
      { name: "status", label: "Status", type: "select", default: "new", options: INBOX_STATUS }, { name: "assigned_to", label: "Assigned to", type: "relation", relation: { table: "staff", label: "full_name" } },
      { name: "internal_notes", label: "Internal notes", type: "textarea", wide: true },
    ],
    list: [{ name: "company", label: "Company" }, { name: "contact_name", label: "Contact" }, { name: "budget", label: "Budget" }, { name: "status", label: "Status", kind: "badge" }, { name: "created_at", label: "Received", kind: "date" }],
    search: ["company", "email"], filters: [{ name: "status", label: "Status", options: INBOX_STATUS }],
    order: { column: "created_at" }, rowLabel: "company", bulkStatus: { field: "status", values: INBOX_STATUS },
  },
  reports: {
    key: "reports", table: "content_reports", title: "Content Reports", singular: "Report", permission: "content_reports.manage", canCreate: false,
    fields: [
      { name: "content_type", label: "Content type", type: "readonly" }, { name: "content_id", label: "Content ID", type: "readonly" },
      { name: "reason", label: "Reason", type: "readonly" }, { name: "details", label: "Details", type: "readonly", wide: true },
      { name: "status", label: "Status", type: "select", default: "open", options: opts("open", "reviewing", "resolved", "dismissed") },
    ],
    list: [{ name: "content_type", label: "Type", kind: "badge" }, { name: "reason", label: "Reason", kind: "badge" }, { name: "details", label: "Details" }, { name: "status", label: "Status", kind: "badge" }, { name: "created_at", label: "Reported", kind: "date" }],
    filters: [{ name: "status", label: "Status", options: opts("open", "reviewing", "resolved", "dismissed") }],
    order: { column: "created_at" }, rowLabel: "reason", bulkStatus: { field: "status", values: opts("resolved", "dismissed") },
  },
  requests: {
    key: "requests", table: "account_requests", title: "Account Requests", singular: "Request", permission: "users.manage", canCreate: false, canDelete: false,
    description: "Data export and deletion requests. Process deletions from the user profile (Delete account) after verifying identity.",
    select: "id,request_type,status,user_note,created_at,user_id,user:profiles!account_requests_user_id_fkey(full_name,email)",
    fields: [
      { name: "request_type", label: "Type", type: "readonly" }, { name: "user_note", label: "User note", type: "readonly", wide: true },
      { name: "status", label: "Status", type: "select", default: "pending", options: opts("pending", "in_progress", "completed", "rejected") },
      { name: "admin_note", label: "Admin note", type: "textarea", wide: true },
    ],
    list: [{ name: "user", label: "User", kind: "relation" }, { name: "request_type", label: "Type", kind: "badge" }, { name: "status", label: "Status", kind: "badge" }, { name: "created_at", label: "Requested", kind: "date" }],
    filters: [{ name: "status", label: "Status", options: opts("pending", "in_progress", "completed", "rejected") }, { name: "request_type", label: "Type", options: opts("data_export", "account_deletion", "data_access") }],
    order: { column: "created_at" }, rowLabel: "request_type",
  },
  segments: {
    key: "segments", table: "user_segments", title: "User Segments", singular: "Segment", permission: "analytics.view",
    fields: [
      { name: "name", label: "Name", type: "text", required: true }, { name: "description", label: "Description", type: "text" },
      { name: "rules", label: "Rules (JSON)", type: "json", wide: true,
        help: 'Keys: professions[], countries[], registered_within_days, registered_after, registered_before, verified, active_within_days, inactive_for_days, min_score_30d, preferred_market, follows_broker, feature (prompts|scripts|ai|articles) + feature_min, marketing_consent' },
    ],
    list: [{ name: "name", label: "Name" }, { name: "description", label: "Description" }, { name: "is_system", label: "System", kind: "bool" }],
    order: { column: "name", ascending: true }, rowLabel: "name",
  },
  redirects: {
    key: "redirects", table: "redirects", title: "Redirects", singular: "Redirect", permission: "settings.manage",
    fields: [{ name: "from_path", label: "From path", type: "text", required: true }, { name: "to_path", label: "To (path or URL)", type: "text", required: true },
      { name: "status_code", label: "Status", type: "select", default: 301, options: [{ value: "301", label: "301 permanent" }, { value: "302", label: "302 temporary" }, { value: "308", label: "308 permanent" }] }],
    list: [{ name: "from_path", label: "From" }, { name: "to_path", label: "To" }, { name: "status_code", label: "Code" }],
    search: ["from_path"], order: { column: "created_at" }, rowLabel: "from_path",
  },
  flags: {
    key: "flags", table: "feature_flags", title: "Feature Flags", singular: "Feature flag", permission: "settings.manage", canCreate: false, canDelete: false,
    description: "Disable modules without deleting data.",
    fields: [{ name: "key", label: "Key", type: "readonly" }, { name: "description", label: "Description", type: "text" }, { name: "enabled", label: "Enabled", type: "boolean" }],
    list: [{ name: "key", label: "Key" }, { name: "description", label: "Description" }, { name: "enabled", label: "Enabled", kind: "bool" }],
    order: { column: "key", ascending: true }, rowLabel: "key",
  },
};

export const RESOURCE_KEYS = Object.keys(RESOURCES);

/** Primary key column for tables that don't use `id`. */
export const PK: Record<string, string> = { feature_flags: "key" };
