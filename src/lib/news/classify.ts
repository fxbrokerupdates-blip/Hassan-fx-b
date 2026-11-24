export interface Classification {
  market: string | null;
  brokerId: string | null;
  priority: "hot" | "warm" | "normal";
  highRisk: boolean;
  reasons: string[];
}

const MARKET_RULES: [RegExp, string][] = [
  [/\b(gold|xau|bullion)\b/i, "gold"],
  [/\b(bitcoin|btc|ethereum|eth|crypto|stablecoin|altcoin)\b/i, "crypto"],
  [/\b(oil|brent|wti|opec)\b/i, "oil"],
  [/\b(fed|fomc|ecb|boe|boj|rba|snb|central bank|rate decision|interest rates?)\b/i, "central_banks"],
  [/\b(cpi|inflation|nfp|non-farm|payrolls|gdp|pmi|retail sales|unemployment)\b/i, "economic_data"],
  [/\b(eur\/?usd|gbp\/?usd|usd\/?jpy|dollar|euro|yen|sterling|forex|fx market|currency)\b/i, "forex"],
  [/\b(s&p|nasdaq|dow|stocks?|equities|ftse|dax|nikkei)\b/i, "stock_markets"],
  [/\b(silver|copper|wheat|commodit(y|ies)|natural gas)\b/i, "commodities"],
  [/\b(war|sanction|tariff|election|geopolitic)/i, "geopolitics"],
  [/\b(us economy|treasury|white house|congress)\b/i, "us_economy"],
];

const PROMO = /\b(bonus|deposit|offer|promo|giveaway|cashback|win|prize|limited time|exclusive)\b/i;

/** Rule-based classification. HOT is never assigned from promotional or sensational wording alone. */
export function classify(input: { title: string; summary: string; trusted: boolean; newsType: string; brokers: { id: string; name: string }[];
  hotKeywords: string[]; riskKeywords: string[] }): Classification {
  const text = `${input.title} ${input.summary}`;
  const lower = text.toLowerCase();
  const reasons: string[] = [];
  const market = input.newsType === "trading" ? (MARKET_RULES.find(([r]) => r.test(text))?.[1] ?? null) : null;
  const broker = input.brokers
    .filter((b) => b.name.length >= 3)
    .find((b) => new RegExp(`\\b${b.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(input.title));
  const highRisk = input.riskKeywords.some((k) => lower.includes(k.toLowerCase()));
  if (highRisk) reasons.push("Contains high-risk wording (scam/regulatory/legal) — editorial review required");
  const promotional = PROMO.test(input.title);
  if (promotional) reasons.push("Promotional wording — verify the offer before publishing");
  let priority: Classification["priority"] = "normal";
  const hot = input.hotKeywords.some((k) => lower.includes(k.toLowerCase()));
  if (hot && input.trusted && !promotional && !/[!]{2,}|shocking|you won'?t believe/i.test(input.title)) priority = "hot";
  else if (hot || market === "central_banks" || market === "economic_data" || broker) priority = "warm";
  return { market, brokerId: broker?.id ?? null, priority, highRisk: highRisk || promotional, reasons };
}
