import Link from "next/link";
import {listBrokers,listVerifiedLicenseRecords} from "@/lib/data/brokers";
import {pricingFor,roundTurnUsd} from "@/lib/data/broker-pricing";
type Broker=Awaited<ReturnType<typeof listBrokers>>[number];
type License=Awaited<ReturnType<typeof listVerifiedLicenseRecords>>[number];
export function BrokerComparison({compared,licenses,clearHref="/brokers"}:{compared:Broker[];licenses:License[];clearHref?:string}){
const records=(id:string)=>licenses.filter(r=>r.broker_id===id);
const val=(x:string|number|string[]|null|undefined)=>Array.isArray(x)?x.join(", ")||"Not disclosed":x??"Not disclosed";
return <>{compared.length > 0 && <section className="card-plain mb-6 overflow-x-auto p-4" aria-label="Broker comparison">
          <div className="mb-3 flex items-center justify-between"><h2 className="section-title">Broker comparison</h2><Link href={clearHref} className="text-sm text-gold-400">Clear</Link></div>
          <table className="table-clean"><thead><tr><th>Feature</th>{compared.map(b=><th key={b.id}><Link href={`/brokers/${b.slug}`}>{b.name}</Link></th>)}</tr></thead>
          <tbody>
            <tr><th scope="row">Checked entity license records</th>{compared.map(b=><td key={b.id}>{b.is_sample ? "Sample" : records(b.id).length ? records(b.id).map(r=><p key={`${r.regulator}-${r.license_number}`}>{r.regulator} · {r.license_number} · {r.jurisdiction}</p>) : "Not independently checked"}</td>)}</tr>
            <tr><th scope="row">Platforms</th>{compared.map(b=><td key={b.id}>{val(b.platforms)}</td>)}</tr>
            <tr><th scope="row">Account types</th>{compared.map(b=><td key={b.id}>{val(b.account_types)}</td>)}</tr>
            <tr><th scope="row">Minimum deposit</th>{compared.map(b=><td key={b.id}>{val(b.min_deposit)}</td>)}</tr>
            <tr><th scope="row">EUR/USD published account pricing</th>{compared.map(b=><td key={b.id}>{!b.is_sample && pricingFor(b.slug).length ? pricingFor(b.slug).map(p=><div key={p.account} className="mb-3 border-b border-white/10 pb-3 last:border-0"><p className="font-semibold">{p.account} · {p.jurisdiction}</p><p className="text-xs text-muted">{p.entity} · {p.platform} · USD account</p><p>Min spread: {p.minPips ?? "Not recorded"} pips</p><p>Avg spread: {p.avgPips ?? "Not recorded"}{p.avgPips === null ? "" : " pips"}</p><p>Commission: {p.commissionUsdPerLotSide === null ? "Not recorded" : "$"+p.commissionUsdPerLotSide+" / lot / side"}</p><p>Retail leverage: {p.retailLeverage ?? "Not recorded"}</p><p>Est. average round turn: {roundTurnUsd(p,"average") === null ? "Not available" : "$"+roundTurnUsd(p,"average")?.toFixed(2)}</p><p className="text-xs text-muted">Checked {p.checkedOn} · {p.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="mr-2 text-gold-400 underline">{s.label}</a>)}</p></div>) : "Pricing not recorded"}</td>)}</tr>
            <tr><th scope="row">Instruments</th>{compared.map(b=><td key={b.id}>{val(b.instruments)}</td>)}</tr>
            <tr><th scope="row">Regulation sources</th>{compared.map(b=><td key={b.id}><Link className="text-gold-400" href={`/brokers/${b.slug}`}>View profile</Link></td>)}</tr>
            <tr><th scope="row">Sponsored</th>{compared.map(b=><td key={b.id}>{b.is_sponsored ? "Yes" : "No"}</td>)}</tr>
          </tbody></table>
          <p className="mt-3 text-xs text-muted">Published pricing snapshots, not live quotes. Estimated EUR/USD round-turn cost for one standard lot in a USD account excludes financing, slippage and other fees. Minimum and average spreads are different measures. Check the relevant legal entity and account terms.</p>
        </section>}</>;
}
