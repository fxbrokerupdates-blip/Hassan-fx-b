import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

/**
 * Service-role client. BYPASSES RLS — use only in server code after your own
 * authorization checks (API routes, cron jobs, server actions).
 */
let admin: SupabaseClient | null = null;
export function createSupabaseAdmin(): SupabaseClient | null {
  if (!env.supabaseUrl || !serverEnv.serviceRoleKey) return null;
  admin ??= createClient(env.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
