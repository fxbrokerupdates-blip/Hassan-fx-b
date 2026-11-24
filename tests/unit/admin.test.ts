import { describe, expect, it } from "vitest";
import { buildRecord } from "@/lib/admin/validate";
import { RESOURCES } from "@/lib/admin/resources";
import { resolveRange } from "@/lib/admin/range";
import { signUpSchema, passwordStrength } from "@/lib/validation/auth";

const fd = (o: Record<string, string>) => { const f = new FormData(); Object.entries(o).forEach(([k, v]) => f.set(k, v)); return f; };

describe("admin record validation", () => {
  it("validates and coerces news fields", () => {
    const { values, errors, extras } = buildRecord(RESOURCES.news, fd({ news_type: "broker", title: "Hello World Headline", priority: "hot", status: "draft",
      key_highlights: "one | two", _tags: "gold, fed", original_url: "javascript:alert(1)", scheduled_at: "2026-12-01T10:30" }), true);
    expect(errors.original_url).toBeDefined();
    expect(values.slug).toBe("hello-world-headline");
    expect(values.key_highlights).toEqual(["one", "two"]);
    expect(extras._tags).toEqual(["gold", "fed"]);
    expect(values.scheduled_at).toBe("2026-12-01T10:30:00.000Z");
  });
  it("rejects invalid select options and requires fields", () => {
    const { errors } = buildRecord(RESOURCES.news, fd({ news_type: "stocks", title: "", priority: "hot", status: "published" }), true);
    expect(errors.news_type).toBe("Invalid option");
    expect(errors.title).toBe("Required");
  });
  it("requires a regulation source URL", () => {
    const { errors } = buildRecord(RESOURCES.regulations, fd({ broker_id: "11111111-1111-4111-8111-111111111111", regulator: "X", status: "verified" }), true);
    expect(errors.verification_url).toBe("Required");
  });
});

describe("date ranges", () => {
  it("resolves named ranges", () => {
    const r = resolveRange({ range: "7d" });
    expect((Date.parse(r.to) - Date.parse(r.from)) / 86400_000).toBe(6);
    const c = resolveRange({ range: "custom", from: "2026-11-10", to: "2026-11-01" });
    expect(c.from).toBe("2026-11-01");
  });
});

describe("registration validation", () => {
  const ok = { full_name: "Ali Khan", email: "ali@example.com", phone_country_code: "+92", phone: "3001234567", country: "PK", profession: "trader",
    password: "StrongPass123", confirm_password: "StrongPass123", terms: "on" };
  it("accepts a valid registration", () => expect(signUpSchema.safeParse(ok).success).toBe(true));
  it("rejects weak or mismatched passwords and missing terms", () => {
    expect(signUpSchema.safeParse({ ...ok, password: "short", confirm_password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, confirm_password: "Different123" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, terms: undefined }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, country: "ZZ" }).success).toBe(false);
  });
  it("scores password strength", () => expect(passwordStrength("Abcdefghij1!xyz").score).toBe(5));
});
