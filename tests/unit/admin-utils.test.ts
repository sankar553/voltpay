import { describe, expect, it } from "vitest";

import { addDays } from "@/lib/dates";
import { isUniqueViolation } from "@/lib/db-errors";

describe("addDays", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-01", 15)).toBe("2026-10-16");
    expect(addDays("2026-12-25", 15)).toBe("2027-01-09");
    expect(addDays("2028-02-20", 10)).toBe("2028-03-01");
  });
});

describe("isUniqueViolation", () => {
  it("detects Postgres 23505 directly or wrapped by Drizzle", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
