"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Monitor, Radio, Smartphone, Tablet } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface LiveRow {
  presence_key: string; user_id: string | null; full_name: string | null; email: string | null; state: "active" | "idle"; current_path: string | null;
  current_feature: string | null; session_started_at: string; last_heartbeat_at: string; last_interaction_at: string | null;
  session_engaged_seconds: number | null; today_engaged_seconds: number | null; today_sessions: number | null; device_category: string | null;
  browser: string | null; country: string | null; traffic_source: string | null; open_tabs: number;
}

const DeviceIcon = ({ d }: { d: string | null }) => d === "mobile" ? <Smartphone className="size-4" /> : d === "tablet" ? <Tablet className="size-4" /> : <Monitor className="size-4" />;

/** Live presence table: Supabase Realtime triggers refreshes; 15s polling is the fallback. */
export function LiveVisitors({ initial, offlineSeconds }: { initial: LiveRow[]; offlineSeconds: number }) {
  const [rows, setRows] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<"all" | "members" | "guests">("all");
  const [live, setLive] = useState(false);
  const supabase = createSupabaseBrowser();

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.rpc("get_live_visitors", { p_online_seconds: offlineSeconds });
    if (data) setRows(data as LiveRow[]);
    setNow(Date.now());
  }, [supabase, offlineSeconds]);

  useEffect(() => {
    const t = setInterval(refresh, 15_000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    let pending: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase?.channel("live-presence")
      .on("postgres_changes", { event: "*", schema: "public", table: "visitor_presence" }, () => {
        if (!pending) pending = setTimeout(() => { pending = null; refresh(); }, 1500);
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { clearInterval(t); clearInterval(clock); if (ch) supabase?.removeChannel(ch); };
  }, [refresh, supabase]);

  const visible = useMemo(() => rows.filter((r) => filter === "all" || (filter === "members" ? r.user_id : !r.user_id)), [rows, filter]);
  const members = rows.filter((r) => r.user_id).length;
  const active = rows.filter((r) => r.state === "active").length;
  const features = Object.entries(rows.reduce<Record<string, number>>((a, r) => { const k = r.current_feature ?? "other"; a[k] = (a[k] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Online now", rows.length], ["Members", members], ["Guests", rows.length - members], ["Active", active], ["Idle", rows.length - active]].map(([l, v]) => (
          <div key={l as string} className="card-plain p-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{l}</p><p className="mt-1 font-display text-3xl font-bold">{v}</p></div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("flex items-center gap-2 text-sm", live ? "text-emerald-300" : "text-amber-300")}><Radio className={cn("size-4", live && "animate-pulse")} />{live ? "Realtime connected" : "Polling every 15s"}</span>
        <div className="ml-auto flex gap-1">
          {(["all", "members", "guests"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1 text-sm capitalize ring-1", filter === f ? "bg-gold-500 text-navy-950 ring-gold-500" : "ring-white/15")}>{f}</button>
          ))}
        </div>
      </div>
      {features.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">{features.map(([f, n]) => <span key={f} className="rounded-full bg-white/5 px-3 py-1 capitalize">{f.replace(/_/g, " ")}: <strong>{n}</strong></span>)}</div>
      )}
      <div className="card-plain overflow-x-auto">
        <table className="table-clean">
          <thead><tr><th>Visitor</th><th>Status</th><th>Current page</th><th>Session</th><th>Engaged (est.)</th><th>Today</th><th>Last activity</th><th>Device</th><th>Country</th><th>Source</th></tr></thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted">Nobody is online right now.</td></tr>}
            {visible.map((r) => (
              <tr key={r.presence_key}>
                <td>{r.user_id ? (
                  <Link href={`/admin/users/${r.user_id}`} className="font-medium hover:text-gold-400">{r.full_name || "Member"}<span className="block text-xs text-muted">{r.email ?? "email hidden"}</span></Link>
                ) : <span className="text-muted">Guest</span>}{r.open_tabs > 1 && <span className="block text-[11px] text-muted">{r.open_tabs} tabs (counted once)</span>}</td>
                <td><span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", r.state === "active" ? "text-emerald-300" : "text-amber-300")}>
                  <span className={cn("size-2 rounded-full", r.state === "active" ? "bg-emerald-400" : "bg-amber-400")} />{r.state}</span></td>
                <td className="max-w-56"><span className="block truncate">{r.current_path ?? "—"}</span><span className="text-xs capitalize text-muted">{r.current_feature?.replace(/_/g, " ")}</span></td>
                <td className="whitespace-nowrap">{formatDuration((now - new Date(r.session_started_at).getTime()) / 1000)}<span className="block text-xs text-muted">since {new Date(r.session_started_at).toISOString().slice(11, 16)} UTC</span></td>
                <td>{formatDuration(r.session_engaged_seconds ?? 0)}</td>
                <td className="whitespace-nowrap">{r.user_id ? <>{formatDuration(r.today_engaged_seconds ?? 0)}<span className="block text-xs text-muted">{r.today_sessions ?? 0} sessions</span></> : "—"}</td>
                <td className="whitespace-nowrap text-muted">{r.last_interaction_at ? `${Math.round((now - new Date(r.last_interaction_at).getTime()) / 1000)}s ago` : "—"}</td>
                <td><span className="flex items-center gap-1.5"><DeviceIcon d={r.device_category} />{r.browser}</span></td>
                <td>{r.country ?? "—"}</td>
                <td className="capitalize">{r.traffic_source ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
