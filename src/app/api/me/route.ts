import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Minimal viewer summary for the public header (no PII beyond the first name). */
export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return NextResponse.json({ user: null }, { headers: { "Cache-Control": "private, no-store" } });
  const supabase = await createSupabaseServer();
  const { count } = await supabase.from("user_notifications").select("id", { count: "exact", head: true })
    .eq("user_id", viewer.id).is("read_at", null);
  return NextResponse.json(
    { user: { name: viewer.profile?.full_name || "Member", isStaff: viewer.isStaff, unread: count ?? 0 } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
