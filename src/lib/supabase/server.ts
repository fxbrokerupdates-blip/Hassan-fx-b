import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "@/lib/env";

/** Per-request client bound to the visitor's auth cookies. RLS applies. */
export async function createSupabaseServer(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          // "Remember me" unchecked → browser-session cookies (no persistent expiry).
          const sessionOnly = cookieStore.get("fxbu_session_only")?.value === "1";
          list.forEach(({ name, value, options }) => {
            const opts = sessionOnly && value ? { ...options, maxAge: undefined, expires: undefined } : options;
            cookieStore.set(name, value, opts);
          });
        } catch {
          // Called from a Server Component — the proxy refreshes sessions instead.
        }
      },
    },
  });
}

/** Cookie-less anonymous client for public, cacheable reads. RLS applies as `anon`. */
let publicClient: SupabaseClient | null = null;
export function createSupabasePublic(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  publicClient ??= createJsClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
}
