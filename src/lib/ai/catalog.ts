/** Content types offered in the AI Creator Studio (shared by client and server). */
export const CONTENT_TYPES = [
  { value: "banner_prompt", label: "AI Banner Prompt", hint: "Detailed image-generation prompt for a financial banner" },
  { value: "short_video_script", label: "Short Video Script", hint: "Hook, script and closing for 15–60 seconds" },
  { value: "long_video_script", label: "Long Video Script", hint: "90 seconds – 2+ minutes with sections" },
  { value: "facebook_post", label: "Facebook Post", hint: "Engaging post for a page or group" },
  { value: "linkedin_post", label: "LinkedIn Post", hint: "Professional, insight-led post" },
  { value: "instagram_caption", label: "Instagram Caption", hint: "Short caption with line breaks" },
  { value: "whatsapp_caption", label: "WhatsApp Caption", hint: "Concise broadcast message" },
  { value: "telegram_post", label: "Telegram Post", hint: "Channel post with clear structure" },
  { value: "youtube_title", label: "YouTube Title", hint: "5 title options under 70 characters" },
  { value: "youtube_description", label: "YouTube Description", hint: "Description with chapters and disclaimer" },
  { value: "seo_keywords", label: "SEO Keywords", hint: "Primary and long-tail keyword list" },
  { value: "website_article", label: "Website Article", hint: "Structured original article" },
  { value: "news_summary", label: "News Summary", hint: "Neutral summary with key facts" },
  { value: "press_release", label: "Professional Press Release Draft", hint: "Draft for review — never publish unverified" },
  { value: "email_newsletter", label: "Email Newsletter", hint: "Subject line + body" },
  { value: "hashtags", label: "Social Media Hashtags", hint: "Relevant hashtag sets" },
] as const;
export type ContentTypeValue = (typeof CONTENT_TYPES)[number]["value"];

export const TONES = ["Professional", "Friendly", "Urgent", "Educational", "Neutral", "Persuasive", "Conversational"] as const;
export const LENGTHS = ["Short", "Medium", "Long"] as const;
export const AUDIENCES = ["Traders", "Beginner traders", "Introducing Brokers", "Affiliates", "Broker clients", "Financial professionals", "General public"] as const;
export const PLATFORMS = ["Facebook", "LinkedIn", "Instagram", "WhatsApp", "Telegram", "YouTube", "TikTok", "X (Twitter)", "Website", "Email"] as const;
export const AI_LANGUAGES = [
  { value: "en", label: "English" }, { value: "ur", label: "Urdu" }, { value: "roman_ur", label: "Roman Urdu" },
  { value: "hi", label: "Hindi" }, { value: "ar", label: "Arabic" },
] as const;

export const PROVIDERS = [
  { value: "gemini", label: "Google Gemini", env: "GEMINI_API_KEY", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"] },
  { value: "openai", label: "OpenAI", env: "OPENAI_API_KEY", models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"] },
  { value: "anthropic", label: "Anthropic", env: "ANTHROPIC_API_KEY", models: ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"] },
  { value: "openai_compatible", label: "OpenAI-compatible", env: "OPENAI_COMPATIBLE_API_KEY", models: [] as string[] },
] as const;
export type ProviderId = (typeof PROVIDERS)[number]["value"];
