import { describe, expect, it } from "vitest";

import { calculateBill } from "@/server/tariff";

const domestic = {
  slabs: [
    { uptoUnits: 100, paisePerUnit: 300 },
    { uptoUnits: 200, paisePerUnit: 450 },
    { uptoUnits: 400, paisePerUnit: 650 },
    { uptoUnits: null, paisePerUnit: 800 },
  ],
  fixedChargePaise: 5000,
  dutyBps: 500,
};

describe("calculateBill", () => {
  it("charges zero energy for zero units but still adds fixed charge", () => {
    const b = calculateBill(0, domestic);
    expect(b).toMatchObject({ energyPaise: 0, dutyPaise: 0, fixedPaise: 5000, totalPaise: 5000 });
  });

  it("stays inside the first slab", () => {
    expect(calculateBill(100, domestic).energyPaise).toBe(30_000);
  });

  it("charges only the marginal units at the higher rate", () => {
    // 100 @ ₹3 + 1 @ ₹4.50
    expect(calculateBill(101, domestic).energyPaise).toBe(30_000 + 450);
  });

  it("handles a bill spanning all slabs", () => {
    // 100@3 + 100@4.5 + 200@6.5 + 50@8 = 300+450+1300+400 = ₹2450
    const b = calculateBill(450, domestic);
    expect(b.energyPaise).toBe(245_000);
    expect(b.dutyPaise).toBe(12_250); // 5%
    expect(b.totalPaise).toBe(245_000 + 5000 + 12_250);
  });

  it("applies adjustments", () => {
    expect(calculateBill(100, domestic, -1000).totalPaise).toBe(30_000 + 5000 + 1500 - 1000);
  });

  it("is independent of slab order", () => {
    const shuffled = { ...domestic, slabs: [...domestic.slabs].reverse() };
    expect(calculateBill(450, shuffled)).toEqual(calculateBill(450, domestic));
  });

  it("rejects invalid units", () => {
    expect(() => calculateBill(-1, domestic)).toThrow(RangeError);
    expect(() => calculateBill(1.5, domestic)).toThrow(RangeError);
  });
});
