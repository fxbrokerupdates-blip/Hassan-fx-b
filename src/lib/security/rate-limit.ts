import "server-only";
import { createHash } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/server-env";

const memory = new Map<string, { reset: number; hits: number }>();

/**
 * Fixed-window rate limit. Uses the database (shared across serverless instances)
 * when the service role is configured, otherwise a per-instance memory map.
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, windowSeconds: number, max: number): Promise<boolean> {
  const admin = createSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.rpc("rate_limit_hit", { p_key: key, p_window_seconds: windowSeconds, p_max: max });
    if (!error) return Boolean(data);
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.reset < now) {
    memory.set(key, { reset: now + windowSeconds * 1000, hits: 1 });
    if (memory.size > 10_000) for (const [k, v] of memory) if (v.reset < now) memory.delete(k);
    return true;
  }
  entry.hits += 1;
  return entry.hits <= max;
}

/** Fast in-memory limiter for very high-volume endpoints (tracking). */
export function memoryRateLimit(key: string, windowSeconds: number, max: number): boolean {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.reset < now) { memory.set(key, { reset: now + windowSeconds * 1000, hits: 1 }); return true; }
  entry.hits += 1;
  return entry.hits <= max;
}

/**
 * Pseudonymous client key for rate limiting only. The raw IP is never stored:
 * it is hashed with a secret that rotates daily.
 */
export function clientKey(req: Request): string {
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${serverEnv.cronSecret || "fxbu"}:${day}:${ip}`).digest("hex").slice(0, 24);
}
