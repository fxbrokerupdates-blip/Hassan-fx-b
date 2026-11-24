export type RawParams = Record<string, string | string[] | undefined>;

/** Reads a single safe string from Next.js searchParams. */
export function str(sp: RawParams, key: string, max = 120): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return undefined;
  const t = s.trim().slice(0, max);
  return t || undefined;
}
export function oneOf<T extends string>(sp: RawParams, key: string, allowed: readonly T[]): T | undefined {
  const v = str(sp, key, 40);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}
export function pageNum(sp: RawParams): number {
  const n = Number(str(sp, "page", 6));
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 1000) : 1;
}
export function dateParam(sp: RawParams, key: string): string | undefined {
  const v = str(sp, key, 10);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}
export function flatParams(sp: RawParams): Record<string, string | undefined> {
  return Object.fromEntries(Object.keys(sp).map((k) => [k, str(sp, k)]));
}
