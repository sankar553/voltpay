import type { TariffSlab } from "@/db/schema";

export type TariffInput = {
  slabs: TariffSlab[];
  fixedChargePaise: number;
  dutyBps: number;
};

export type BillAmounts = {
  units: number;
  energyPaise: number;
  fixedPaise: number;
  dutyPaise: number;
  adjustmentPaise: number;
  totalPaise: number;
};

/**
 * Slab tariff: each slab's `uptoUnits` is a cumulative upper bound, and units
 * falling inside a slab are charged at that slab's rate (not the whole bill).
 * All amounts are integer paise; duty is rounded once.
 *
 * Tariff values are illustrative demo data — real tariffs come from the DISCOM/regulator.
 */
export function calculateBill(
  units: number,
  tariff: TariffInput,
  adjustmentPaise = 0,
): BillAmounts {
  if (!Number.isInteger(units) || units < 0)
    throw new RangeError("units must be a non-negative integer");

  const slabs = [...tariff.slabs].sort(
    (a, b) => (a.uptoUnits ?? Infinity) - (b.uptoUnits ?? Infinity),
  );

  let energyPaise = 0;
  let lower = 0;
  for (const slab of slabs) {
    if (units <= lower) break;
    const upper = slab.uptoUnits ?? Infinity;
    const inSlab = Math.min(units, upper) - lower;
    energyPaise += inSlab * slab.paisePerUnit;
    lower = upper;
  }

  const fixedPaise = tariff.fixedChargePaise;
  const dutyPaise = Math.round((energyPaise * tariff.dutyBps) / 10_000);
  const totalPaise = energyPaise + fixedPaise + dutyPaise + adjustmentPaise;

  return { units, energyPaise, fixedPaise, dutyPaise, adjustmentPaise, totalPaise };
}
