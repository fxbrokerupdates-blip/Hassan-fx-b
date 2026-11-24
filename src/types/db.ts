/**
 * Row types for the tables the app reads. Generate full types later with
 * `npm run db:types` (Supabase CLI) once the project is linked.
 */
export type NewsType = "broker" | "trading";
export type Priority = "hot" | "warm" | "normal";
export type ArticleStatus = "draft" | "pending_review" | "scheduled" | "published" | "archived" | "rejected";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  news_type: "broker" | "trading" | "both";
  icon: string;
  sort_order: number;
  show_on_home: boolean;
  home_description: string | null;
  is_active: boolean;
}

export interface Broker {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  founded_year: number | null;
  headquarters: string | null;
  countries_served: string[];
  platforms: string[];
  account_types: string[];
  min_deposit: string | null;
  instruments: string[];
  payment_methods: string[];
  social_links: Record<string, string>;
  short_description: string | null;
  editorial_review: string | null;
  is_featured: boolean;
  is_sponsored: boolean;
  affiliate_disclosure: string | null;
  status: "active" | "archived";
  last_verified_at: string | null;
  is_sample: boolean;
  created_at: string;
}

export interface Article {
  id: string;
  news_type: NewsType;
  slug: string;
  title: string;
  summary: string | null;
  content: string | null;
  content_origin: "original" | "ai_assisted" | "source_excerpt";
  key_highlights: string[];
  featured_image_url: string | null;
  category_id: string | null;
  broker_id: string | null;
  market: string | null;
  market_impact: "high" | "medium" | "low" | null;
  country: string | null;
  author_name: string | null;
  source_name: string | null;
  original_url: string | null;
  original_published_at: string | null;
  priority: Priority;
  status: ArticleStatus;
  published_at: string | null;
  updated_at: string;
  is_featured: boolean;
  reading_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  noindex: boolean;
  is_sample: boolean;
  view_count: number;
  category?: Pick<Category, "slug" | "name"> | null;
  broker?: Pick<Broker, "slug" | "name"> | null;
}

export interface BannerPrompt {
  id: string;
  title: string;
  prompt_text?: string;
  prompt_preview?: string;
  preview_image_url: string | null;
  category: string;
  tags: string[];
  aspect_ratio: string;
  language: string;
  related_article_id: string | null;
  publish_date: string;
  published_at: string | null;
  is_featured: boolean;
  access_level: "public" | "members";
  copy_enabled?: boolean;
  is_sample: boolean;
}

export interface VideoScript {
  id: string;
  title: string;
  topic: string | null;
  hook: string;
  body?: string;
  closing?: string | null;
  cta?: string | null;
  duration_seconds: number;
  language: string;
  related_article_id: string | null;
  publish_date: string;
  published_at: string | null;
  is_featured: boolean;
  access_level: "public" | "members";
  copy_enabled?: boolean;
  is_sample: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone_country_code: string | null;
  phone: string | null;
  country: string | null;
  profession: string | null;
  avatar_url: string | null;
  preferred_language: string;
  timezone: string;
  status: "active" | "suspended" | "pending_deletion" | "deleted";
  email_verified_at: string | null;
  last_login_at: string | null;
  last_active_at: string | null;
  ai_daily_limit: number | null;
  created_at: string;
}

export interface HomepageSection<T = Record<string, unknown>> {
  key: string;
  title: string;
  content: T;
  is_visible: boolean;
  sort_order: number;
}

export interface NavItem {
  id: string;
  parent_id: string | null;
  label: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
}

export interface FooterSection {
  id: string;
  column_key: string;
  title: string;
  items: { label: string; href: string; external?: boolean; flag?: string; visible?: boolean }[];
  sort_order: number;
  is_visible: boolean;
}

export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  show_in_footer: boolean;
  sort_order: number;
  is_visible: boolean;
}

export interface Advertisement {
  id: string;
  advertiser: string;
  campaign_name: string;
  image_url: string | null;
  headline: string | null;
  destination_url: string;
  placement: string;
  is_affiliate: boolean;
}
