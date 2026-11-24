import "server-only";
import { serverEnv } from "@/lib/server-env";

/** Verifies a Cloudflare Turnstile token when configured. Returns true when bot protection is disabled. */
export async function verifyBotToken(token: string | null | undefined): Promise<boolean> {
  if (!serverEnv.turnstileSecret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: serverEnv.turnstileSecret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json.success);
  } catch {
    return false;
  }
}
