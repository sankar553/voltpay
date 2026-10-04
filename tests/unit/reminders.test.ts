import { describe, expect, it } from "vitest";

import { escapeHtml, reminderKind } from "@/lib/reminders";

const today = "2026-10-04";

describe("reminderKind", () => {
  it("reminds from 3 days before the due date through the due date", () => {
    expect(reminderKind("unpaid", "2026-10-07", today)).toBe("due_soon");
    expect(reminderKind("unpaid", "2026-10-05", today)).toBe("due_soon");
    expect(reminderKind("unpaid", "2026-10-04", today)).toBe("due_soon");
  });
  it("stays quiet until then", () => {
    expect(reminderKind("unpaid", "2026-10-08", today)).toBeNull();
    expect(reminderKind("unpaid", "2026-10-25", today)).toBeNull();
  });
  it("flags anything past due as overdue (unpaid or already marked)", () => {
    expect(reminderKind("unpaid", "2026-10-03", today)).toBe("overdue");
    expect(reminderKind("overdue", "2026-09-01", today)).toBe("overdue");
  });
  it("never nags about paid or cancelled bills", () => {
    expect(reminderKind("paid", "2026-10-05", today)).toBeNull();
    expect(reminderKind("cancelled", "2026-09-01", today)).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("neutralises markup in names that go into emails", () => {
    expect(escapeHtml(`<img src=x onerror="a()">&'`)).toBe(
      "&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;",
    );
  });
});
