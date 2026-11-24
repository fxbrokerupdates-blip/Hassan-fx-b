import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export const json = (data: unknown, status = 200, headers?: Record<string, string>) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", ...headers } });

export const error = (message: string, status = 400) => json({ error: message }, status);

/** Rejects cross-site browser POSTs (CSRF defence for cookie-authenticated JSON APIs). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients / sendBeacon without Origin
  try {
    return new URL(origin).host === new URL(req.url).host || new URL(origin).host === req.headers.get("x-forwarded-host");
  } catch {
    return false;
  }
}

export async function parseBody<T>(req: Request, schema: ZodType<T>, maxBytes = 64_000): Promise<{ data?: T; error?: string }> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return { error: "Payload too large" };
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return { error: "Payload too large" };
    raw = JSON.parse(text || "{}");
  } catch {
    return { error: "Invalid JSON" };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  return { data: parsed.data };
}
