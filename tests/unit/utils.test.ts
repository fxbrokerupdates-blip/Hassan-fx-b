import { describe, expect, it } from "vitest";
import { formatDuration, safeNextPath, slugify, timeAgo, readingMinutes, truncate } from "@/lib/utils";

describe("utils", () => {
  it("slugifies headlines", () => {
    expect(slugify("Gold (XAUUSD) Holds Above $4,160 — Ahead of US Data!")).toBe("gold-xauusd-holds-above-4-160-ahead-of-us-data");
    expect(slugify("IB & Affiliate")).toBe("ib-and-affiliate");
  });
  it("formats relative time", () => {
    const now = Date.parse("2026-11-24T12:00:00Z");
    expect(timeAgo("2026-11-24T11:55:00Z", now)).toBe("5 minutes ago");
    expect(timeAgo("2026-11-24T10:00:00Z", now)).toBe("2 hours ago");
    expect(timeAgo("2026-11-23T12:00:00Z", now)).toBe("1 day ago");
    expect(timeAgo("2026-11-24T11:59:50Z", now)).toBe("just now");
  });
  it("formats durations", () => {
    expect(formatDuration(95)).toBe("1m 35s");
    expect(formatDuration(3725)).toBe("1h 2m");
    expect(formatDuration(0)).toBe("0s");
  });
  it("prevents open redirects", () => {
    expect(safeNextPath("/dashboard/saved")).toBe("/dashboard/saved");
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
  });
  it("estimates reading time and truncates", () => {
    expect(readingMinutes("word ".repeat(660))).toBe(3);
    expect(truncate("abcdef", 4)).toBe("abc…");
  });
});
