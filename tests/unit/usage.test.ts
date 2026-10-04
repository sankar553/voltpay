import { describe, expect, it } from "vitest";

import { usageStats } from "@/lib/usage";

describe("usageStats", () => {
  it("handles no data", () => {
    expect(usageStats([])).toMatchObject({ average: 0, max: 0, trendPercent: null });
  });

  it("computes average, peak and trend", () => {
    const s = usageStats([100, 200, 150, 180]);
    expect(s).toMatchObject({ average: 158, max: 200, maxIndex: 1, latest: 180, previous: 150 });
    expect(s.trendPercent).toBe(20);
  });

  it("reports a decrease and a single data point", () => {
    expect(usageStats([200, 150]).trendPercent).toBe(-25);
    expect(usageStats([120])).toMatchObject({ previous: null, trendPercent: null, latest: 120 });
  });

  it("avoids dividing by zero", () => {
    expect(usageStats([0, 50]).trendPercent).toBeNull();
  });
});
