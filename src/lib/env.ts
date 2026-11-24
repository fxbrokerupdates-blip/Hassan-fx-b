/** Centralised environment access. Public values only are safe in client code. */
export const env = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  appEnv: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  oneSignalAppId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "",
  googleVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isProduction = env.appEnv === "production";
/** Development mode: clearly labelled sample content may be shown. Never in production. */
export const isDevelopmentMode = !isProduction;
