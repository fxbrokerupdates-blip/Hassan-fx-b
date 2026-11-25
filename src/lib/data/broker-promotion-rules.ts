export type PromotionEvidence = {
  status?: string;
  is_verified: boolean;
  starts_at: string | null;
  ends_at: string | null;
  source_url: string | null;
  terms_url: string | null;
};

export function isHttpsEvidence(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !!parsed.hostname && !parsed.username && !parsed.password;
  } catch { return false; }
}

/** Only explicitly verified, dated offers with both evidence and terms are
 * eligible for the current-offers display. Missing expiry is not perpetual. */
export function isCurrentPromotion(p: PromotionEvidence, now = Date.now()): boolean {
  if (p.status !== undefined && p.status !== "active") return false;
  if (!p.is_verified || !isHttpsEvidence(p.source_url) || !isHttpsEvidence(p.terms_url)) return false;
  if (!p.starts_at || !p.ends_at) return false;
  const starts = Date.parse(p.starts_at), ends = Date.parse(p.ends_at);
  return Number.isFinite(starts) && Number.isFinite(ends) && starts <= now && now < ends;
}
