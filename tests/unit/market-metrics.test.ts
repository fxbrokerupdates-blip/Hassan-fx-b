import {describe,it,expect} from "vitest";
import {rateSnapshots,crossRate,crossChange,currencyStrength,positioning} from "../../src/lib/data/market-metrics";
const rates={EUR:1,USD:1.1,GBP:.8,JPY:150,CHF:.9,CAD:1.5,AUD:1.6,NZD:1.8};
const prev={period:"2026-11-23",rates};
const curr={period:"2026-11-24",rates:{...rates,USD:1.2}};
describe("market reference calculations",()=>{
 it("calculates quotes and reciprocal correctly",()=>{expect(crossRate(curr,"EUR","USD")).toBe(1.2);expect(crossRate(curr,"USD","EUR")).toBeCloseTo(1/1.2);expect(crossChange(curr,prev,"EUR","USD")).toBeCloseTo(9.090909);});
 it("recognizes weakening USD rather than rising EUR/USD as USD strength",()=>{const r=currencyStrength(curr,prev);expect(r.at(-1)?.currency).toBe("USD");expect(r.at(-1)?.strength).toBeLessThan(0);});
 it("does not treat an incomplete day as a complete FX basket",()=>{expect(rateSnapshots([{currency:"USD",period:"2026-11-24",units_per_eur:1.2}])).toEqual([]);});
 it("keeps unchanged currency strength neutral",()=>{for(const r of currencyStrength(prev,prev))expect(r.strength).toBeCloseTo(0);});
 it("reports net contracts and directional percentage excluding spreads",()=>{expect(positioning(75,25)).toEqual({net:50,longPercent:75});expect(positioning(0,0)?.longPercent).toBeNull();expect(positioning(null,5)).toBeNull();});
});
