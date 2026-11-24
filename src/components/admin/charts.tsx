"use client";
/**
 * Admin charts. Palette validated for the navy chart surface (#102A46) with the
 * dataviz validator: multi-series uses fixed-order slots (blue, orange, aqua, yellow);
 * a single series uses the brand gold. One axis per chart, thin marks, hover tooltips.
 */
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500"] as const;
export const SINGLE = "#F5C542";
const AXIS = { stroke: "rgba(255,255,255,0.25)", tick: { fill: "#A8B8CA", fontSize: 11 }, tickLine: false };
const TOOLTIP = { contentStyle: { background: "#06182D", border: "1px solid rgba(245,197,66,.5)", borderRadius: 8, fontSize: 12, color: "#fff" }, labelStyle: { color: "#A8B8CA" } };

export interface Series { key: string; label: string }
const fmtNum = (v: unknown) => (typeof v === "number" ? v.toLocaleString("en-US") : String(v));

export function TimeChart({ data, xKey, series, height = 260, area = false, format }: {
  data: Record<string, unknown>[]; xKey: string; series: Series[]; height?: number; area?: boolean; format?: (v: number) => string;
}) {
  if (!data.length) return <p className="grid place-items-center rounded-lg border border-dashed border-white/10 text-sm text-muted" style={{ height }}>No data for this period yet.</p>;
  const color = (i: number) => (series.length === 1 ? SINGLE : SERIES[i % SERIES.length]);
  const f = (v: unknown) => (format && typeof v === "number" ? format(v) : fmtNum(v));
  const Chart = area ? AreaChart : LineChart;
  return (
    <div style={{ height }} role="img" aria-label={`Chart of ${series.map((s) => s.label).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey={xKey} {...AXIS} minTickGap={24} />
          <YAxis {...AXIS} width={48} tickFormatter={(v) => f(v)} allowDecimals={false} />
          <Tooltip {...TOOLTIP} formatter={(v, n) => [f(v), n]} cursor={{ stroke: "rgba(255,255,255,0.3)" }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#A8B8CA" }} iconType="plainline" />}
          {series.map((s, i) => area ? (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={color(i)} fill={color(i)} fillOpacity={0.12} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ) : (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={color(i)} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#102A46", strokeWidth: 2 }} />
          ))}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, xKey, series, height = 260, layout = "horizontal" }: {
  data: Record<string, unknown>[]; xKey: string; series: Series[]; height?: number; layout?: "horizontal" | "vertical";
}) {
  if (!data.length) return <p className="grid place-items-center rounded-lg border border-dashed border-white/10 text-sm text-muted" style={{ height }}>No data for this period yet.</p>;
  const vertical = layout === "vertical";
  return (
    <div style={{ height }} role="img" aria-label={`Bar chart of ${series.map((s) => s.label).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout} margin={{ top: 8, right: 12, left: vertical ? 8 : 0, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={vertical} horizontal={!vertical} />
          {vertical ? (
            <><XAxis type="number" {...AXIS} allowDecimals={false} /><YAxis type="category" dataKey={xKey} {...AXIS} width={130} /></>
          ) : (
            <><XAxis dataKey={xKey} {...AXIS} minTickGap={8} /><YAxis {...AXIS} width={44} allowDecimals={false} /></>
          )}
          <Tooltip {...TOOLTIP} formatter={(v, n) => [fmtNum(v), n]} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#A8B8CA" }} />}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={series.length === 1 ? SINGLE : SERIES[i % SERIES.length]}
              radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Day-of-week × hour-of-day heatmap (sequential single hue, UTC) with a text alternative. */
export function Heatmap({ cells }: { cells: { dow: number; hour: number; sessions: number }[] }) {
  const max = Math.max(1, ...cells.map((c) => c.sessions));
  const get = (d: number, h: number) => cells.find((c) => c.dow === d && c.hour === h)?.sessions ?? 0;
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-[2px] text-[10px]" aria-label="Sessions by weekday and hour (UTC)">
        <thead><tr><th className="sr-only">Day</th>{Array.from({ length: 24 }, (_, h) => <th key={h} className="w-6 font-normal text-muted">{h % 3 === 0 ? h : ""}</th>)}</tr></thead>
        <tbody>
          {DAYS.map((d, i) => (
            <tr key={d}>
              <th className="pr-2 text-right font-normal text-muted">{d}</th>
              {Array.from({ length: 24 }, (_, h) => {
                const v = get(i + 1, h);
                return (
                  <td key={h} title={`${d} ${String(h).padStart(2, "0")}:00 UTC — ${v} sessions`} aria-label={`${d} ${h}:00, ${v} sessions`}
                    className="h-5 w-6 rounded-[3px]" style={{ background: v ? `rgba(57,135,229,${0.15 + 0.85 * (v / max)})` : "rgba(255,255,255,0.04)" }} />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted">Darker = more sessions. Times in UTC. Hover a cell for the exact count.</p>
    </div>
  );
}

export function Funnel({ steps }: { steps: { step: string; count: number }[] }) {
  const top = Math.max(1, steps[0]?.count ?? 1);
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].count : null;
        const conv = prev ? (prev > 0 ? Math.round((s.count / prev) * 1000) / 10 : 0) : null;
        return (
          <li key={s.step}>
            <div className="mb-1 flex justify-between text-xs"><span>{i + 1}. {s.step}</span>
              <span className="text-muted">{s.count.toLocaleString()} {conv !== null && <>· {conv}% of previous · <span className="text-white/70">drop-off {Math.max(0, 100 - conv).toFixed(1)}%</span></>}</span></div>
            <div className="h-6 rounded bg-white/5"><div className="h-6 rounded" style={{ width: `${Math.max(2, (s.count / top) * 100)}%`, background: SINGLE }} /></div>
          </li>
        );
      })}
    </ol>
  );
}
