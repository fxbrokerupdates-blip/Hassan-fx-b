import "server-only";
import { serverEnv } from "@/lib/server-env";
import { isProduction } from "@/lib/env";

export interface EmailResult { sent: boolean; reason?: string; id?: string }

export const emailConfigured = () => serverEnv.emailProvider === "resend" && Boolean(serverEnv.resendKey);

/** Sends one email via the configured provider. Never sends in development mode. */
export async function sendEmail(to: string, subject: string, html: string, headers?: Record<string, string>): Promise<EmailResult> {
  if (!isProduction) return { sent: false, reason: "development mode — email not sent" };
  if (!emailConfigured()) return { sent: false, reason: "email provider not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${serverEnv.resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: serverEnv.emailFrom, to: [to], subject, html, headers }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    return res.ok ? { sent: true, id: j.id } : { sent: false, reason: j.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send failed" };
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
