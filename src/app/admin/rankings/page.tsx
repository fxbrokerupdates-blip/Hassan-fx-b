import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, EstimateNote } from "@/components/admin/ui";
import { RangePicker } from "@/components/admin/range-picker";
import { RecalcButton } from "@/components/admin/run-buttons";
import { resolveRange } from "@/lib/admin/range";
import { oneOf, str, type RawParams } from "@/lib/params";
import { PROFESSIONS, labelOf } from "@/lib/defaults";
import { COUNTRIES, countryName } from "@/lib/countries";
import { formatDate, formatDuration, formatNumber, cn } from "@/lib/utils";

export const metadata = { title: "User Rankings" };
export const dynamic = "force-dynamic";

const BOARDS = [
  { key: "score", label: "Most Active (score)", metric: "score" },
  { key: "consistency", label: "Most Consistent Daily Visitors", metric: "consistency" },
  { key: "engaged", label: "Highest Engaged Time", metric: "engaged" },
  { key: "articles", label: "Most Articles Read", metric: "articles" },
  { key: "prompts", label: "Most Banner Prompts Copied", metric: "prompts" },
  { key: "scripts", label: "Most Video Scripts Copied", metric: "scripts" },
  { key: "ai", label: "Most AI Generations", metric: "ai" },
  { key: "saved", label: "Most Content Saved", metric: "saved" },
  { key: "sessions", label: "Most Sessions", metric: "sessions" },
  { key: "creators", label: "Most Active Content Creators", metric: "score", profession: "content_creator" },
  { key: "ibs", label: "Most Active IB Partners", metric: "score", profession: "introducing_broker" },
  { key: "employees", label: "Most Active Broker Employees", metric: "score", profession: "broker_employee" },
] as const;

interface Row { rank: number; previous_rank: number | null; user_id: string; full_name: string; profession: string | null; country: string | null; registered_at: string;
  last_active_at: string | null; active_days: number; sessions: number; engaged_seconds: number; articles_read: number; prompts_copied: number;
  scripts_copied: number; ai_generations: number; content_saved: number; score: number; metric_value: number }

export default async function RankingsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requirePermission("analytics.view");
  const sp = await searchParams;
  const board = BOARDS.find((b) => b.key === str(sp, "board", 20)) ?? BOARDS[0];
  const r = resolveRange(sp, "7d");
  const country = str(sp, "country", 2);
  const profession = ("profession" in board ? board.profession : undefined) ?? oneOf(sp, "profession", PROFESSIONS.map((p) => p.value));
  const status = oneOf(sp, "status", ["active", "suspended"] as const);
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_from: r.from, p_to: r.to, p_metric: board.metric, p_country: country ?? null, p_profession: profession ?? null, p_status: status ?? null, p_limit: 100, p_offset: 0,
  });
  const rows = (data ?? []) as Row[];
  const keep = { board: board.key, country, profession: "profession" in board ? undefined : profession, status };
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...keep, range: r.key, from: r.from, to: r.to, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/rankings?${p}`;
  };
  return (
    <div>
      <AdminHeader title="User Engagement" gold="Rankings" description={`${board.label} · ${r.label} (${r.from} → ${r.to}). Private to authorized staff.`}
        actions={<><RecalcButton /><Link href="/admin/settings?tab=analytics" className="btn-outline h-10 px-4 text-sm">Score weights</Link>
          <a href={`/api/admin/export?report=rankings&metric=${board.metric}&from=${r.from}&to=${r.to}${profession ? `&profession=${profession}` : ""}${country ? `&country=${country}` : ""}`} className="btn-outline h-10 px-4 text-sm">Export CSV</a></>} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {BOARDS.map((b) => <Link key={b.key} href={qs({ board: b.key })} className={cn("rounded-full px-3 py-1 text-xs ring-1", b.key === board.key ? "bg-gold-500 font-semibold text-navy-950 ring-gold-500" : "ring-white/15 hover:text-gold-400")}>{b.label}</Link>)}
      </div>
      <div className="card-plain mb-4 flex flex-wrap items-center gap-3 p-3">
        <RangePicker current={r.key} from={r.from} to={r.to} keep={keep} />
        <form className="flex flex-wrap gap-2">
          <input type="hidden" name="board" value={board.key} /><input type="hidden" name="range" value={r.key} /><input type="hidden" name="from" value={r.from} /><input type="hidden" name="to" value={r.to} />
          <select name="country" defaultValue={country ?? ""} className="input h-10 w-44" aria-label="Country"><option value="">All countries</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
          {!("profession" in board) && <select name="profession" defaultValue={profession ?? ""} className="input h-10 w-44" aria-label="Profession"><option value="">All professions</option>{PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>}
          <select name="status" defaultValue={status ?? ""} className="input h-10 w-36" aria-label="Account status"><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
          <button className="btn-outline h-10 px-4">Filter</button>
        </form>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error.message}</p>}
      <div className="card-plain overflow-x-auto">
        <table className="table-clean">
          <thead><tr><th>Rank</th><th>User</th><th>Profession</th><th>Country</th><th>Registered</th><th>Last active</th><th>Active days</th><th>Sessions</th><th>Engaged*</th>
            <th>Articles</th><th>Prompts</th><th>Scripts</th><th>AI</th><th>Saved</th><th>Score</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={15} className="p-8 text-center text-muted">No activity recorded for this period.</td></tr>}
            {rows.map((x) => {
              const move = x.previous_rank ? x.previous_rank - x.rank : null;
              return (
                <tr key={x.user_id}>
                  <td className="whitespace-nowrap font-display font-bold">#{x.rank}{" "}
                    {move === null ? <span className="text-[10px] font-normal text-muted">new</span> : move > 0 ? <span className="inline-flex items-center text-xs text-emerald-400"><ArrowUp className="size-3" />{move}</span>
                      : move < 0 ? <span className="inline-flex items-center text-xs text-red-400"><ArrowDown className="size-3" />{-move}</span> : <Minus className="inline size-3 text-muted" />}</td>
                  <td><Link href={`/admin/users/${x.user_id}`} className="font-medium hover:text-gold-400">{x.full_name || "Member"}</Link><span className="block font-mono text-[10px] text-muted">{x.user_id.slice(0, 8)}</span></td>
                  <td>{labelOf(PROFESSIONS, x.profession)}</td><td>{countryName(x.country)}</td>
                  <td className="whitespace-nowrap text-muted">{formatDate(x.registered_at)}</td><td className="whitespace-nowrap text-muted">{formatDate(x.last_active_at)}</td>
                  <td>{x.active_days}</td><td>{x.sessions}</td><td className="whitespace-nowrap">{formatDuration(x.engaged_seconds)}</td>
                  <td>{x.articles_read}</td><td>{x.prompts_copied}</td><td>{x.scripts_copied}</td><td>{x.ai_generations}</td><td>{x.content_saved}</td>
                  <td className="font-semibold text-gold-400">{formatNumber(Math.round(Number(x.score)))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted">
        <p>Raw usage metrics are shown separately from the engagement score. Copies count unique items per day; repeated refreshes, copies and generations beyond daily caps do not add points. Movement compares with the previous period of equal length.</p>
        <EstimateNote />
      </div>
    </div>
  );
}
