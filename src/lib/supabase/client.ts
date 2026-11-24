"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";

let browser: SupabaseClient | null = null;
export function createSupabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  browser ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return browser;
}
