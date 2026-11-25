import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, Building2, ExternalLink, ShieldAlert } from "lucide-react";
import { pricingFor, roundTurnUsd } from "@/lib/data/broker-pricing";
import { getBroker } from "@/lib/data/brokers";
import { listNews } from "@/lib/data/news";
import { PageHeader } from "@/components/news/page-header";
import { NewsCard } from "@/components/news/news-card";
import { FollowButton } from "@/components/brokers/follow-button";
import { SaveButton } from "@/components/news/save-button";
import { ReportButton } from "@/components/news/report-button";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { RichText } from "@/components/ui/rich-text";
import { SampleBadge } from "@/components/news/badges";
import { formatDate } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getBroker(slug);
  if (!d) return { title: "Broker not found" };
  return pageMetadata({ title: `${d.broker.name} — Broker Profile, News & Review`, description: d.broker.short_description ?? undefined,
    path: `/brokers/${slug}`, image: d.broker.logo_url, noindex: d.broker.is_sample });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-white/5 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt><dd>{Array.isArray(value) ? value.join(", ") : value}</dd>
    </div>
  );
}

export default async function BrokerProfilePage({ params }: Props) {
  const { slug } = await params;
  const d = await getBroker(slug);
  if (!d) notFound();
  const { broker: b, regulations, promotions, reviews, sources } = d;
  const news = await listNews({ broker: slug, pageSize: 6 });
  const editorial = reviews.filter((r) => r.review_type === "editorial");
  const userReviews = reviews.filter((r) => r.review_type === "user");
  const sponsored = reviews.filter((r) => r.review_type === "sponsored");
  return (
    <>
      <PageHeader title={b.name} crumbs={[{ name: "Home", path: "/" }, { name: "Broker Reviews", path: "/brokers" }, { name: b.name, path: `/brokers/${slug}` }]} />
      <TrackOnMount event="broker_view" content_type="broker" content_id={b.id} />
      <div className="container-site grid gap-8 py-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          <section className="card-plain flex flex-wrap items-center gap-5 p-6">
            <span className="grid size-20 place-items-center overflow-hidden rounded-xl bg-white">
              {b.logo_url ? <Image src={b.logo_url} alt={`${b.name} logo`} width={80} height={80} className="object-contain" /> : <Building2 className="size-10 text-navy-800" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold">{b.name}</h2>
                {b.is_sponsored && <span className="badge-warm">Sponsored placement</span>}
                <SampleBadge show={b.is_sample} />
              </div>
              {b.short_description && <p className="mt-1 text-white/75">{b.short_description}</p>}
              <p className="mt-1 text-xs text-muted">Last verified: {b.last_verified_at ? formatDate(b.last_verified_at) : "not yet verified"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FollowButton brokerId={b.id} />
              <SaveButton type="broker" id={b.id} title={b.name} label />
              {b.website_url && (
                <TrackedLink href={b.website_url} external event="external_link_click" content_type="broker" content_id={b.id} className="btn-outline h-10 px-4">
                  Official website <ExternalLink className="size-4" />
                </TrackedLink>
              )}
            </div>
          </section>
          {b.affiliate_disclosure && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100"><strong>Disclosure:</strong> {b.affiliate_disclosure}</p>
          )}

          <section>
            <h2 className="section-title mb-3">Key <span className="gold-text">information</span></h2>
            <dl className="card-plain px-5 py-2">
              <Row label="Founded" value={b.founded_year} />
              <Row label="Headquarters" value={b.headquarters} />
              <Row label="Countries served" value={b.countries_served} />
              <Row label="Trading platforms" value={b.platforms} />
              <Row label="Account types" value={b.account_types} />
              <Row label="Minimum deposit" value={b.min_deposit} />
              <Row label="Instruments" value={b.instruments} />
              <Row label="Deposit & withdrawal" value={b.payment_methods} />
              <Row label="Social" value={Object.entries(b.social_links ?? {}).filter(([, u]) => /^https:\/\//.test(u)).map(([k, u]) => (
                <a key={k} href={u} target="_blank" rel="noopener noreferrer nofollow" className="mr-3 capitalize text-gold-400 hover:underline">{k}</a>))} />
            </dl>
          </section>

          <section>
            <h2 className="section-title mb-3">Regulation <span className="gold-text">& licenses</span></h2>
            {regulations.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-white/70"><ShieldAlert className="size-4 text-amber-400" />No license information with a verification source has been added yet.</p>
            ) : (
              <div className="card-plain overflow-x-auto">
                <table className="table-clean">
                  <thead><tr><th>Regulator</th><th>License</th><th>Jurisdiction</th><th>Status</th><th>Source</th></tr></thead>
                  <tbody>
                    {regulations.map((r) => (
                      <tr key={r.id}>
                        <td>{r.regulator}</td><td>{r.license_number ?? "—"}</td><td>{r.jurisdiction ?? "—"}</td>
                        <td>{r.status === "verified" ? <span className="flex items-center gap-1 text-emerald-400"><BadgeCheck className="size-4" />Verified {r.verified_at && formatDate(r.verified_at)}</span> : <span className="capitalize text-amber-300">{r.status}</span>}</td>
                        <td><a href={r.verification_url} target="_blank" rel="noopener noreferrer nofollow" className="text-gold-400 hover:underline">Verify</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-muted">Always confirm license status directly on the regulator’s official register.</p>
          </section>

          <section>
            <h2 className="section-title mb-3">EUR/USD <span className="gold-text">trading costs</span></h2>
            {!b.is_sample && pricingFor(b.slug).length > 0 ? <div className="card-plain overflow-x-auto"><table className="table-clean"><thead><tr><th>Entity &amp; account</th><th>Min / avg spread</th><th>USD commission / side</th><th>Retail leverage</th><th>Estimated avg round turn</th></tr></thead><tbody>{pricingFor(b.slug).map(p=><tr key={p.account}><td>{p.entity}<br/>{p.account} · {p.platform}<br/><span className="text-xs text-muted">USD account · {p.checkedOn}</span></td><td>{p.minPips ?? "—"} / {p.avgPips ?? "—"} pips</td><td>{p.commissionUsdPerLotSide === null ? "—" : "$"+p.commissionUsdPerLotSide}</td><td>{p.retailLeverage ?? "Not recorded"}</td><td>{roundTurnUsd(p,"average") === null ? "—" : "$"+roundTurnUsd(p,"average")?.toFixed(2)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted">Entity-specific pricing not yet recorded.</p>}
            <p className="mt-2 text-xs text-muted">Not live quotes. Cost estimates are for one standard lot, excluding financing, slippage and other charges. Refer to the source links below and confirm current terms.</p>
          </section>
          <section>
            <h2 className="section-title mb-3">Evidence <span className="gold-text">&amp; sources</span></h2>
            <p className="mb-3 text-xs text-muted">Broker disclosures are not independent regulatory verification. Availability and terms vary by legal entity.</p>
            {sources.length ? <ul className="card-plain divide-y divide-white/10 px-4">{sources.map((s,i) => <li key={i} className="py-3 text-sm">{/^https:\/\//.test(s.url) ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-gold-400 hover:underline">{s.label}</a> : <span>{s.label}</span>}<span className="mt-1 block text-xs text-muted">Source recorded {formatDate(s.checked_at)} · {s.source_kind.replaceAll("_"," ")}</span></li>)}</ul> : <p className="text-sm text-muted">No supporting sources recorded yet.</p>}
          </section>
          {promotions.length > 0 && (
            <section>
              <h2 className="section-title mb-3">Current <span className="gold-text">promotions</span></h2>
              <div className="grid gap-3">
                {promotions.map((p) => (
                  <div key={p.id} className="card-plain p-4">
                    <p className="font-semibold">{p.title} {!p.is_verified && <span className="badge-normal ml-2 normal-case">Unverified — as announced by the broker</span>}</p>
                    {p.description && <p className="mt-1 text-sm text-white/75">{p.description}</p>}
                    <p className="mt-2 text-xs text-muted">{p.ends_at ? `Ends ${formatDate(p.ends_at)}` : "No end date announced"} {p.terms_url && <a className="ml-2 text-gold-400" href={p.terms_url} target="_blank" rel="noopener noreferrer nofollow">Terms</a>}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="section-title mb-3">Editorial <span className="gold-text">review</span></h2>
            {b.editorial_review || editorial.length ? (
              <div className="card-plain p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-400">Independent editorial review</p>
                {b.editorial_review && <RichText text={b.editorial_review} className="prose-fx text-base" />}
                {editorial.map((r) => <div key={r.id} className="mt-4"><p className="font-semibold">{r.title}</p><RichText text={r.body} className="prose-fx text-base" /></div>)}
              </div>
            ) : <p className="text-sm text-white/70">No editorial review published yet.</p>}
            {sponsored.map((r) => (
              <div key={r.id} className="card-plain mt-4 border-amber-500/40 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">Sponsored content — paid by the broker</p>
                <p className="font-semibold">{r.title}</p><RichText text={r.body} className="prose-fx text-base" />
              </div>
            ))}
            {userReviews.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 font-display font-bold">Member reviews</h3>
                {userReviews.map((r) => (
                  <div key={r.id} className="border-b border-white/10 py-3">
                    <p className="font-semibold">{r.title} {r.rating && <span className="text-gold-400">· {r.rating}/5</span>}</p>
                    <p className="text-sm text-white/75">{r.body}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
          <ReportButton contentType="broker" contentId={b.id} />
        </div>
        <aside>
          <section className="card-plain p-4">
            <h2 className="mb-3 font-display text-lg font-bold">{b.name} <span className="gold-text">news</span></h2>
            {news.items.length ? news.items.map((a) => <NewsCard key={a.id} a={a} variant="compact" />) : <p className="text-sm text-muted">No news yet.</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
