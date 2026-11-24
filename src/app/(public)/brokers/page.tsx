import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/news/page-header";
import { listBrokers } from "@/lib/data/brokers";
import { pageMetadata } from "@/lib/seo";
import { str, type RawParams } from "@/lib/params";
import { SampleBadge } from "@/components/news/badges";

export const metadata: Metadata = pageMetadata({
  title: "Broker Reviews & Directory",
  description: "Forex broker profiles with regulation sources, platforms, account types, news and editorial reviews.",
  path: "/brokers",
});

export default async function BrokersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const q = str(sp, "q", 60);
  const brokers = await listBrokers(q);
  return (
    <>
      <PageHeader title="Broker" gold="Reviews" description="Profiles list only information with a verifiable source. Sponsored placements are always labelled and never affect editorial reviews."
        crumbs={[{ name: "Home", path: "/" }, { name: "Broker Reviews", path: "/brokers" }]} />
      <div className="container-site py-8">
        <form className="mb-6 flex max-w-xl gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Search brokers…" className="input" aria-label="Search brokers" />
          <button className="btn-gold px-5">Search</button>
        </form>
        {brokers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-12 text-center text-white/70">No brokers listed yet.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {brokers.map((b) => (
              <Link key={b.id} href={`/brokers/${b.slug}`} className="card-plain flex gap-4 p-5 transition hover:border-gold-500/60">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                  {b.logo_url ? <Image src={b.logo_url} alt="" width={56} height={56} className="object-contain" /> : <Building2 className="size-7 text-navy-800" />}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-condensed text-xl font-semibold">{b.name}</span>
                    {b.is_sponsored && <span className="badge-warm">Sponsored</span>}
                    {b.is_featured && <span className="badge-tag">Featured</span>}
                    <SampleBadge show={b.is_sample} />
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-white/70">{b.short_description ?? "Broker profile"}</span>
                  {b.platforms.length > 0 && <span className="mt-2 block text-xs text-muted">Platforms: {b.platforms.join(", ")}</span>}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
