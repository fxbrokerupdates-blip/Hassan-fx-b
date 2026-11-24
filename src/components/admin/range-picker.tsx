import { RANGES } from "@/lib/admin/range";

/** GET-form date range control (keeps other filters via hidden inputs). */
export function RangePicker({ current, from, to, keep = {} }: { current: string; from: string; to: string; keep?: Record<string, string | undefined> }) {
  return (
    <form className="flex flex-wrap items-center gap-2">
      {Object.entries(keep).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
      <select name="range" defaultValue={current} className="input h-10 w-40" aria-label="Date range">
        {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
      </select>
      <input type="date" name="from" defaultValue={from} className="input h-10 w-40" aria-label="From (custom)" />
      <input type="date" name="to" defaultValue={to} className="input h-10 w-40" aria-label="To (custom)" />
      <button className="btn-gold h-10 px-4">Apply</button>
    </form>
  );
}
