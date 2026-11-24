import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/** Verified user id from the auth cookie (JWT signature checked), without loading the profile. */
export async function getViewerId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getClaims();
    return (data?.claims?.sub as string | undefined) ?? null;
  } catch {
    return null;
  }
}
