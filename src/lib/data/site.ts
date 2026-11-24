import "server-only";
import { cache } from "react";
import { createSupabasePublic } from "@/lib/supabase/server";
import {
  DEFAULT_CATEGORIES, DEFAULT_FLAGS, DEFAULT_FOOTER, DEFAULT_HOMEPAGE, DEFAULT_NAV, DEFAULT_SETTINGS, DEFAULT_SOCIAL,
  DEFAULT_VISIBILITY, type HomepageContent, type HomepageKey, type SettingsMap,
} from "@/lib/defaults";
import type { Category, FooterSection, NavItem, SocialLink } from "@/types/db";

export interface SiteConfig {
  settings: SettingsMap;
  homepage: HomepageContent;
  visibility: Record<HomepageKey, boolean>;
  nav: NavItem[];
  footer: FooterSection[];
  social: SocialLink[];
  categories: Category[];
  flags: Record<string, boolean>;
  source: "database" | "defaults";
}

function merge<T extends object>(base: T, override: unknown): T {
  return override && typeof override === "object" ? { ...base, ...(override as Partial<T>) } : base;
}

/** Loads public website configuration once per request (falls back to built-in defaults). */
export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  const fallback: SiteConfig = {
    settings: DEFAULT_SETTINGS, homepage: DEFAULT_HOMEPAGE, visibility: DEFAULT_VISIBILITY, nav: DEFAULT_NAV,
    footer: DEFAULT_FOOTER, social: DEFAULT_SOCIAL, categories: DEFAULT_CATEGORIES, flags: DEFAULT_FLAGS, source: "defaults",
  };
  const db = createSupabasePublic();
  if (!db) return fallback;
  try {
    const [settings, home, nav, footer, social, cats, flags] = await Promise.all([
      db.from("website_settings").select("key,value").eq("is_public", true),
      db.from("homepage_sections").select("key,content,is_visible"),
      db.from("navigation_items").select("*").eq("is_visible", true).order("sort_order"),
      db.from("footer_sections").select("*").eq("is_visible", true).order("sort_order"),
      db.from("social_links").select("*").eq("is_visible", true).order("sort_order"),
      db.from("news_categories").select("*").eq("is_active", true).order("sort_order"),
      db.from("feature_flags").select("key,enabled"),
    ]);
    if (settings.error) throw settings.error;
    const s: Record<string, unknown> = {};
    for (const row of settings.data ?? []) s[row.key] = row.value;
    const mergedSettings = Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS).map(([k, v]) => [k, merge(v, s[k])]),
    ) as unknown as SettingsMap;

    const homepage = { ...DEFAULT_HOMEPAGE } as Record<string, unknown>;
    const visibility = { ...DEFAULT_VISIBILITY } as Record<string, boolean>;
    for (const row of home.data ?? []) {
      if (row.key in DEFAULT_HOMEPAGE) {
        homepage[row.key] = merge(DEFAULT_HOMEPAGE[row.key as HomepageKey], row.content);
        visibility[row.key] = row.is_visible;
      }
    }
    const flagMap = { ...DEFAULT_FLAGS };
    for (const f of flags.data ?? []) flagMap[f.key] = f.enabled;

    return {
      settings: mergedSettings,
      homepage: homepage as unknown as HomepageContent,
      visibility: visibility as Record<HomepageKey, boolean>,
      nav: nav.data?.length ? (nav.data as NavItem[]) : DEFAULT_NAV,
      footer: footer.data?.length ? (footer.data as FooterSection[]) : DEFAULT_FOOTER,
      social: (social.data as SocialLink[]) ?? DEFAULT_SOCIAL,
      categories: cats.data?.length ? (cats.data as Category[]) : DEFAULT_CATEGORIES,
      flags: flagMap,
      source: "database",
    };
  } catch (e) {
    console.error("[site-config] falling back to defaults:", e);
    return fallback;
  }
});
