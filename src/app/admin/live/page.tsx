import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, EstimateNote } from "@/components/admin/ui";
import { LiveVisitors, type LiveRow } from "@/components/admin/live-visitors";
import { getSiteConfig } from "@/lib/data/site";

export const metadata = { title: "Live Visitors" };
export const dynamic = "force-dynamic";

export default async function LivePage() {
  await requirePermission("analytics.live");
  const { settings } = await getSiteConfig();
  const offline = settings["analytics.tracking"].offline_seconds;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("get_live_visitors", { p_online_seconds: offline });
  return (
    <div>
      <AdminHeader title="Live" gold="Visitors" description={`People with a heartbeat in the last ${offline} seconds. One row per person — multiple tabs are never double-counted. Idle = no interaction for ${settings["analytics.tracking"].idle_seconds}s.`} />
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error.message}</p>}
      <LiveVisitors initial={(data ?? []) as LiveRow[]} offlineSeconds={offline} />
      <div className="mt-4"><EstimateNote /></div>
    </div>
  );
}
