import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/news/page-header";
import { listBrokers, listVerifiedLicenseRecords } from "@/lib/data/brokers";
import { pageMetadata } from "@/lib/seo";
import { str, type RawParams } from "@/lib/params";
import { BrokerComparison } from "@/components/brokers/comparison";
import { SampleBadge } from "@/components/news/badges";

export const metadata: Metadata = pageMetadata({
  title: "Broker Intelligence Center",
  description: "Explore broker profiles, compare platforms and account types, and find regulatory verification sources.",
  path: "/brokers",
});

export default async function BrokersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const q = str(sp, "q", 60);
  const platform = str(sp, "platform", 60);
  const sort = str(sp, "sort", 20);
  const [all, licenses] = await Promise.all([listBrokers(), listVerifiedLicenseRecords()]);
  const jurisdiction = str(sp, "jurisdiction", 80);
  const records = (id: string) => licenses.filter(r => r.broker_id === id);
  const jurisdictions = [...new Set(licenses.flatMap(r => r.jurisdiction ? [r.jurisdiction] : []))].sort();
  const platforms = [...new Set(all.flatMap(b => b.platforms))].sort();
  const raw = sp.compare;
  const selected = [...new Set(Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [])].slice(0, 3);
  const compared = selected.flatMap(slug => all.filter(b => b.slug === slug));
  const brokers = all.filter(b => (!q || [b.name, b.slug, b.headquarters ?? "", ...b.platforms].join(" ").toLowerCase().includes(q.toLowerCase())) && (!platform || b.platforms.includes(platform)) && (!jurisdiction || (!b.is_sample && records(b.id).some(r=>r.jurisdiction===jurisdiction))));
  if (sort === "az") brokers.sort((a,b) => a.name.localeCompare(b.name));
  if (sort === "za") brokers.sort((a,b) => b.name.localeCompare(a.name));
  const val = (x: string | number | string[] | null | undefined) => Array.isArray(x) ? x.join(", ") || "Not disclosed" : x ?? "Not disclosed";
  return (
    <>
      <PageHeader title="Broker" gold="Intelligence" description="Research broker profiles and compare published information. A listing is not an endorsement or proof of a license."
        crumbs={[{name:"Home",path:"/"},{name:"Brokers",path:"/brokers"}]} />
      <div className="container-site py-8 fx-directory">
        <nav aria-label="Broker intelligence sections" className="mb-5 flex flex-wrap gap-3"><Link href="/ib-programs" className="btn-outline px-4 py-2">IB Intelligence Center</Link><Link href="/broker-warnings" className="btn-outline px-4 py-2">Regulatory warnings</Link></nav>
        <div className="card-plain mb-5 p-4 text-sm text-white/75 fx-directory-overview">
          <strong className="text-gold-400">{all.length} broker profiles</strong> · {all.filter(b=>!b.is_sample && records(b.id).length>0).length} profiles with checked entity license records.
          <p className="mt-1">Products, costs and eligibility depend on the legal entity and country. Confirm licenses directly with the regulator before opening an account.</p>
        </div>
        <form className="mb-6 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] fx-directory-filters" role="search">
          <input name="q" defaultValue={q} placeholder="Search name or platform" className="input" aria-label="Search brokers" />
          <select name="platform" defaultValue={platform} className="input" aria-label="Platform"><option value="">All platforms</option>{platforms.map(p=><option key={p}>{p}</option>)}</select>
          <select name="jurisdiction" defaultValue={jurisdiction} className="input" aria-label="License jurisdiction"><option value="">All jurisdictions</option>{jurisdictions.map(j=><option key={j}>{j}</option>)}</select>
          <select name="sort" defaultValue={sort} className="input" aria-label="Sort"><option value="">Featured first</option><option value="az">Name A–Z</option><option value="za">Name Z–A</option></select>
          <button className="btn-gold px-5">Filter</button>
        </form>
        <BrokerComparison compared={compared} licenses={licenses}/>
        <form>
          <input type="hidden" name="jurisdiction" value={jurisdiction ?? ""}/><input type="hidden" name="q" value={q ?? ""}/><input type="hidden" name="platform" value={platform ?? ""}/><input type="hidden" name="sort" value={sort ?? ""}/>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted">{brokers.length} results · Select up to 3 for comparison</p><button className="btn-gold px-5">Compare selected</button></div>
          {brokers.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-12 text-center text-white/70">No matching brokers. <Link href="/brokers" className="text-gold-400">Reset filters</Link></p> :
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 fx-directory-list">
          {brokers.map(b=><article key={b.id} className="card-plain p-4 fx-directory-row">
            <div className="flex items-start gap-3 fx-directory-name"><span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white"><Building2 className="size-6 text-navy-800"/></span><div className="min-w-0 flex-1"><Link href={`/brokers/${b.slug}`} className="font-condensed text-xl font-semibold hover:text-gold-400">{b.name}</Link><p className="text-xs text-muted">{b.is_sample ? "Sample profile" : records(b.id).length ? `${records(b.id).length} entity license record(s) checked` : "License verification pending"}</p><SampleBadge show={b.is_sample}/>{b.is_sponsored && <span className="badge-warm">Sponsored</span>}</div></div>
            <p className="mt-3 text-sm text-white/75 fx-directory-platform"><span>Platforms</span> {val(b.platforms)}</p><p className="mt-1 text-sm text-white/75 fx-directory-deposit"><span>Minimum deposit</span> {val(b.min_deposit)}</p>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3 fx-directory-actions"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="compare" value={b.slug} defaultChecked={selected.includes(b.slug)}/> Compare</label><Link href={`/brokers/${b.slug}`} className="text-sm text-gold-400">View profile</Link></div>
          </article>)}</div>}
        </form>
      </div>
    </>
  );
}
