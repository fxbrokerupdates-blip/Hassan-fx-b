import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { sameOrigin } from "@/lib/security/http";
import { recordServerEvent } from "@/lib/analytics/ingest";

/** Secure logout (POST only, same-origin). Revokes the refresh token for this session. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) await recordServerEvent(data.claims.sub, "logout", { feature: "auth" });
    await supabase.auth.signOut({ scope: "local" });
  }
  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
  res.cookies.delete("fxbu_session_only");
  return res;
}
