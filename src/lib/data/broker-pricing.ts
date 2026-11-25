/** Published pricing examples, not live quotes. Keep every offer scoped to its entity,
 * platform, account currency, instrument and source; never assume brand-wide pricing. */
export type BrokerPricing = {
  brokerSlug: string;
  entity: string;
  jurisdiction: string;
  account: string;
  platform: string;
  instrument: "EUR/USD";
  minPips: number | null;
  avgPips: number | null;
  commissionUsdPerLotSide: number | null;
  retailLeverage: string | null;
  checkedOn: string;
  sources: readonly { label: string; url: string }[];
};

const icSources = [
  {label:"IC Markets EU trading costs",url:"https://www.icmarkets.eu/en/trading-pricing/trading-costs"},
  {label:"IC Markets EU account FAQ",url:"https://www.icmarkets.eu/en/help-resources/faqs"},
];
const pepperSources = [
  {label:"Pepperstone forex spread schedule",url:"https://pepperstone.com/en/markets/forex/pairs-and-spreads"},
  {label:"Pepperstone trading costs",url:"https://pepperstone.com/en/trading/costs-and-fees"},
];
export const BROKER_PRICING: readonly BrokerPricing[] = [
  {brokerSlug:"ic-markets",entity:"IC Markets (EU) Ltd",jurisdiction:"Cyprus",account:"Raw Spread",platform:"MT4",instrument:"EUR/USD",minPips:0,avgPips:0.1,commissionUsdPerLotSide:3.5,retailLeverage:"Up to 1:30",checkedOn:"2026-11-25",sources:icSources},
  {brokerSlug:"ic-markets",entity:"IC Markets (EU) Ltd",jurisdiction:"Cyprus",account:"Standard",platform:"MT4",instrument:"EUR/USD",minPips:0.8,avgPips:null,commissionUsdPerLotSide:0,retailLeverage:"Up to 1:30",checkedOn:"2026-11-25",sources:icSources},
  {brokerSlug:"pepperstone",entity:"Pepperstone Markets Limited",jurisdiction:"Bahamas",account:"Razor",platform:"Pepperstone platform",instrument:"EUR/USD",minPips:0,avgPips:0.1,commissionUsdPerLotSide:3.5,retailLeverage:null,checkedOn:"2026-11-25",sources:pepperSources},
  {brokerSlug:"pepperstone",entity:"Pepperstone Markets Limited",jurisdiction:"Bahamas",account:"Standard",platform:"Pepperstone platform",instrument:"EUR/USD",minPips:1,avgPips:1.1,commissionUsdPerLotSide:0,retailLeverage:null,checkedOn:"2026-11-25",sources:pepperSources},
];

export function pricingFor(slug: string) {
  return BROKER_PRICING.filter(row => row.brokerSlug === slug);
}

/** Approximate 1 standard lot EUR/USD round-turn cost in USD; excludes swap,
 * slippage and other fees. Unknown observations must never be treated as zero. */
export function roundTurnUsd(row: BrokerPricing, basis: "minimum" | "average"): number | null {
  const spread = basis === "minimum" ? row.minPips : row.avgPips;
  if (spread === null || row.commissionUsdPerLotSide === null) return null;
  return Math.round((spread * 10 + 2 * row.commissionUsdPerLotSide) * 100) / 100;
}
