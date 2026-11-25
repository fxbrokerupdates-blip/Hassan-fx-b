"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";
import { track } from "@/lib/analytics/client";

export interface FilterOption { value: string; label: string }

export function NewsFilters({ categories, brokers, markets, showType, showImpact }: {
  categories?: FilterOption[]; brokers?: FilterOption[]; markets?: FilterOption[]; showType?: boolean; showImpact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const preserved = () => { const params = new URLSearchParams(); for (const k of ["tab","month",...(!showType?["type"]:[])]) { const value=sp.get(k); if(value)params.set(k,value); } return params; };
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = preserved();
    for (const [k, v] of fd.entries()) {
      const s = v.toString().trim();
      if (s) params.set(k, s);
    }
    const used = [...params.keys()].filter((k) => k !== "q");
    if (used.length) track("filter_used", { metadata: { filters: used.join(",").slice(0, 100) } });
    if (params.get("q")) track("search", { metadata: { scope: pathname, length: params.get("q")!.length } });
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`);
  }
  const v = (k: string) => sp.get(k) ?? "";
  const active = [...sp.keys()].some(k=>!["page","tab","month",...(!showType?["type"]:[])].includes(k));

  return (
    <form key={sp.toString()} onSubmit={onSubmit} className="fx-news-filters card-plain grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Filter news">
      <div className="relative md:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={v("q")} placeholder="Search headlines…" aria-label="Search" className="input pl-9" maxLength={120} />
      </div>
      {showType && (
        <select name="type" defaultValue={v("type")} className="input" aria-label="News type">
          <option value="">All news</option><option value="broker">Broker news</option><option value="trading">Trading news</option>
        </select>
      )}
      {categories && (
        <select name="category" defaultValue={v("category")} className="input" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      )}
      {markets && (
        <select name="market" defaultValue={v("market")} className="input" aria-label="Market">
          <option value="">All markets</option>
          {markets.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      )}
      {brokers && (
        <select name="broker" defaultValue={v("broker")} className="input" aria-label="Broker">
          <option value="">All brokers</option>
          {brokers.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      )}
      <select name="priority" defaultValue={v("priority")} className="input" aria-label="Priority">
        <option value="">HOT / WARM / NORMAL</option><option value="hot">HOT</option><option value="warm">WARM</option><option value="normal">NORMAL</option>
      </select>
      {showImpact && (
        <select name="impact" defaultValue={v("impact")} className="input" aria-label="Market impact">
          <option value="">Any impact</option><option value="high">High impact</option><option value="medium">Medium impact</option><option value="low">Low impact</option>
        </select>
      )}
      <input name="source" defaultValue={v("source")} placeholder="Source" aria-label="Source" className="input" maxLength={60} />
      <input name="country" defaultValue={v("country")} placeholder="Country (e.g. AE)" aria-label="Country" className="input" maxLength={2} />
      <label className="flex items-center gap-2 text-sm text-muted">From<input type="date" name="from" defaultValue={v("from")} className="input" /></label>
      <label className="flex items-center gap-2 text-sm text-muted">To<input type="date" name="to" defaultValue={v("to")} className="input" /></label>
      <div className="flex gap-2 md:col-span-2 lg:col-span-1">
        <button className="btn-gold h-10 flex-1"><Filter className="size-4" />Apply</button>
        {active && <button type="button" onClick={() => { const params=preserved(); router.push(pathname+(params.size?"?"+params.toString():"")); }} className="btn-outline h-10 px-3" aria-label="Clear filters"><X className="size-4" /></button>}
      </div>
    </form>
  );
}
