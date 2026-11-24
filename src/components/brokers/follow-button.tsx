"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

export function FollowButton({ brokerId, initial }: { brokerId: string; initial?: boolean }) {
  const [following, setFollowing] = useState(Boolean(initial));
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (initial !== undefined || brokerId.startsWith("sample-")) return;
    fetch(`/api/brokers/follow?broker_id=${brokerId}`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setFollowing(Boolean(d.following))).catch(() => undefined);
  }, [brokerId, initial]);
  async function toggle() {
    if (brokerId.startsWith("sample-")) { alert("Sample brokers cannot be followed. Connect Supabase first."); return; }
    setBusy(true);
    const res = await fetch("/api/brokers/follow", { method: following ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ broker_id: brokerId }) });
    setBusy(false);
    if (res.status === 401) { router.push(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
    if (res.ok) { track(following ? "broker_unfollow" : "broker_follow", { content_type: "broker", content_id: brokerId }); setFollowing(!following); router.refresh(); }
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={following}
      className={cn(following ? "btn-outline" : "btn-gold", "h-10 px-4")}>
      <Heart className={cn("size-4", following && "fill-current")} /> {following ? "Following" : "Follow broker"}
    </button>
  );
}
