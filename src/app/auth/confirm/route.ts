import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";
import { recordServerEvent } from "@/lib/analytics/ingest";

/** Email verification / password recovery links (token_hash flow). */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(url.searchParams.get("next"), "/dashboard");
  if (token_hash && type) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      if ((type === "signup" || type === "email") && data.user) await recordServerEvent(data.user.id, "email_verified", { feature: "auth" });
      return NextResponse.redirect(new URL(next, req.url));
    }
  }
  return NextResponse.redirect(new URL("/verify-email?error=invalid_link", req.url));
}
