/** Whitelisted analytics events. Anything else is rejected by /api/track. */
export const EVENT_NAMES = [
  // navigation & auth
  "page_view", "session_start", "session_end", "registration_completed", "email_verified", "login_success", "logout",
  // news
  "news_list_view", "article_open", "article_engaged", "article_progress", "news_saved", "news_shared", "source_link_click",
  "broker_view", "broker_follow", "broker_unfollow", "report_submitted",
  // content tools
  "banner_prompt_view", "banner_prompt_copy", "banner_prompt_save", "video_script_view", "video_script_copy", "video_script_save",
  "ai_studio_open", "ai_generation_requested", "ai_generation_completed", "ai_generation_failed",
  "ai_output_copy", "ai_output_save", "ai_output_download", "content_saved",
  // other
  "search", "filter_used", "notification_open", "external_link_click", "dott_plus_click", "facebook_click", "linkedin_click",
  "newsletter_signup", "profile_updated", "share_click", "ad_click",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];
export const EVENT_SET = new Set<string>(EVENT_NAMES);

/** Copy-type events are de-duplicated server-side within a short window. */
export const DEDUPED_EVENTS = new Set<string>([
  "banner_prompt_copy", "video_script_copy", "ai_output_copy", "article_engaged", "article_open", "banner_prompt_view", "video_script_view",
]);

export const CONTENT_TYPES = new Set(["article", "banner_prompt", "video_script", "broker", "ai_generation", "notification", "ad"]);

/** Maps a path to a product feature for "current page/feature" reporting. */
export function featureFromPath(path: string): string {
  if (path === "/") return "home";
  const rules: [RegExp, string][] = [
    [/^\/dashboard\/studio/, "ai_studio"], [/^\/admin/, "admin"], [/^\/dashboard\/prompts|^\/free-tools\/banner-prompts/, "banner_prompts"],
    [/^\/dashboard\/scripts|^\/free-tools\/video-scripts/, "video_scripts"], [/^\/broker-updates|^\/dashboard\/news\?type=broker/, "broker_updates"],
    [/^\/trading-updates/, "trading_updates"], [/^\/news\/[^/]+/, "article"], [/^\/news|^\/dashboard\/news/, "news_center"],
    [/^\/brokers/, "broker_directory"], [/^\/dashboard\/saved/, "saved_content"], [/^\/dashboard\/history/, "content_history"],
    [/^\/dashboard\/notifications/, "notifications"], [/^\/dashboard\/brokers/, "favourite_brokers"], [/^\/dashboard/, "dashboard"],
    [/^\/search/, "search"], [/^\/category/, "category"], [/^\/(login|signup|forgot-password|reset-password)/, "auth"],
  ];
  return rules.find(([r]) => r.test(path))?.[1] ?? "other";
}

/** Strips query strings and ids that could carry personal data; keeps a small set of safe params. */
export function sanitizePath(raw: string): string {
  try {
    const u = new URL(raw, "https://x.local");
    const keep = ["type", "market", "category", "page"];
    const params = new URLSearchParams();
    for (const k of keep) {
      const v = u.searchParams.get(k);
      if (v && /^[a-z0-9_-]{1,40}$/i.test(v)) params.set(k, v);
    }
    const qs = params.toString();
    return `${u.pathname.slice(0, 250)}${qs ? `?${qs}` : ""}`;
  } catch {
    return "/";
  }
}
