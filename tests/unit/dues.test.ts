import { describe, expect, it } from "vitest";

import { billDisplayState, daysUntil, todayInIndia } from "@/lib/dues";

describe("due dates", () => {
  it("counts whole calendar days", () => {
    expect(daysUntil("2026-10-15", "2026-10-10")).toBe(5);
    expect(daysUntil("2026-10-15", "2026-10-15")).toBe(0);
    expect(daysUntil("2026-10-15", "2026-10-16")).toBe(-1);
    expect(daysUntil("2026-11-01", "2026-10-31")).toBe(1);
  });

  it("classifies bills", () => {
    expect(billDisplayState("paid", "2020-01-01", "2026-10-10")).toBe("paid");
    expect(billDisplayState("unpaid", "2026-10-20", "2026-10-10")).toBe("upcoming");
    expect(billDisplayState("unpaid", "2026-10-15", "2026-10-10")).toBe("due_soon");
    expect(billDisplayState("unpaid", "2026-10-10", "2026-10-10")).toBe("due_soon");
    expect(billDisplayState("unpaid", "2026-10-09", "2026-10-10")).toBe("overdue");
    expect(billDisplayState("overdue", "2026-12-01", "2026-10-10")).toBe("overdue");
    expect(billDisplayState("cancelled", "2026-10-01", "2026-10-10")).toBe("cancelled");
  });

  it("uses the Indian calendar date", () => {
    // 20:00 UTC on 4 Oct is already 5 Oct (01:30) in India
    expect(todayInIndia(new Date("2026-10-04T20:00:00Z"))).toBe("2026-10-05");
    expect(todayInIndia(new Date("2026-10-04T10:00:00Z"))).toBe("2026-10-04");
  });
});
