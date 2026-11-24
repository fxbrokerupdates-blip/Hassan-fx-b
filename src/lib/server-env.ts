import "server-only";

/** Server-only secrets. Never import this file from a client component. */
export const serverEnv = {
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  cronSecret: process.env.CRON_SECRET || "",
  geminiKey: process.env.GEMINI_API_KEY || "",
  openaiKey: process.env.OPENAI_API_KEY || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  compatibleKey: process.env.OPENAI_COMPATIBLE_API_KEY || "",
  compatibleBaseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL || "",
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY || "",
  emailProvider: process.env.EMAIL_PROVIDER || "",
  resendKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "FX Broker Updates <news@fxbrokerupdates.com>",
  oneSignalKey: process.env.ONESIGNAL_REST_API_KEY || "",
};

export const isServiceRoleConfigured = () => Boolean(serverEnv.serviceRoleKey && process.env.NEXT_PUBLIC_SUPABASE_URL);

/** Masks a secret for display: "sk-…a1b2". Never returns the full value. */
export function maskSecret(value: string): string {
  if (!value) return "";
  return value.length <= 8 ? "••••" : `${value.slice(0, 3)}…${value.slice(-4)}`;
}
