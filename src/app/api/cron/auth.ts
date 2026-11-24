import "server-only";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/server-env";

/** Scheduler requests must send "Authorization: Bearer <CRON_SECRET>" (Vercel Cron does this automatically). */
export function cronAuthorized(req: Request): boolean {
  const secret = serverEnv.cronSecret;
  if (!secret || secret.length < 16) return false;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
