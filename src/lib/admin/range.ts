import { str, type RawParams } from "@/lib/params";

export const RANGES = [
  { key: "today", label: "Today" }, { key: "yesterday", label: "Yesterday" }, { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" }, { key: "this_week", label: "This week" }, { key: "last_week", label: "Last week" },
  { key: "this_month", label: "This month" }, { key: "last_month", label: "Last month" }, { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
] as const;

const day = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);

/** Resolves a named range to inclusive UTC dates (from/to as YYYY-MM-DD). */
export function resolveRange(sp: RawParams, fallback = "30d"): { key: string; from: string; to: string; label: string } {
  const key = str(sp, "range", 20) ?? fallback;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (today.getUTCDay() + 6) % 7; // Monday = 0
  let from = addDays(today, -29), to = today;
  switch (key) {
    case "today": from = today; break;
    case "yesterday": from = to = addDays(today, -1); break;
    case "7d": from = addDays(today, -6); break;
    case "this_week": from = addDays(today, -dow); break;
    case "last_week": from = addDays(today, -dow - 7); to = addDays(today, -dow - 1); break;
    case "this_month": from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); break;
    case "last_month": from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)); to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)); break;
    case "all": from = new Date(Date.UTC(2020, 0, 1)); break;
    case "custom": {
      const f = str(sp, "from", 10), t = str(sp, "to", 10);
      if (f && /^\d{4}-\d{2}-\d{2}$/.test(f)) from = new Date(`${f}T00:00:00Z`);
      if (t && /^\d{4}-\d{2}-\d{2}$/.test(t)) to = new Date(`${t}T00:00:00Z`);
      if (from > to) [from, to] = [to, from];
      break;
    }
  }
  return { key, from: day(from), to: day(to), label: RANGES.find((r) => r.key === key)?.label ?? "Last 30 days" };
}
