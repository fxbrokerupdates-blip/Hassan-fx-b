import { describe, expect, it } from "vitest";
import { isCurrentPromotion } from "../../src/lib/data/broker-promotion-rules";
const now = Date.parse("2026-11-25T12:00:00Z");
const valid = {status:"active",is_verified:true,starts_at:"2026-11-24T00:00:00Z",ends_at:"2026-11-26T00:00:00Z",source_url:"https://example.com/offer",terms_url:"https://example.com/terms"};
describe("public broker promotions",()=>{
  it("shows a sourced, checked and current offer",()=>expect(isCurrentPromotion(valid,now)).toBe(true));
  it("hides expired and future offers",()=>{
    expect(isCurrentPromotion({...valid,ends_at:"2026-11-25T12:00:00Z"},now)).toBe(false);
    expect(isCurrentPromotion({...valid,starts_at:"2026-11-26T00:00:00Z"},now)).toBe(false);
  });
  it("hides missing dates, draft and unverified records",()=>{
    expect(isCurrentPromotion({...valid,ends_at:null},now)).toBe(false);
    expect(isCurrentPromotion({...valid,status:"draft"},now)).toBe(false);
    expect(isCurrentPromotion({...valid,is_verified:false},now)).toBe(false);
  });
  it("requires safe HTTPS evidence and terms",()=>{
    expect(isCurrentPromotion({...valid,source_url:null},now)).toBe(false);
    expect(isCurrentPromotion({...valid,terms_url:"javascript:alert(1)"},now)).toBe(false);
    expect(isCurrentPromotion({...valid,source_url:"https://user:pass@example.com"},now)).toBe(false);
  });
});
