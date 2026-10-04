import "server-only";
import { and, desc, eq, lte } from "drizzle-orm";

import { db } from "@/db";
import { bills, meterReadings, meters, tariffs } from "@/db/schema";
import { addDays } from "@/lib/dates";
import { isUniqueViolation } from "@/lib/db-errors";
import { calculateBill } from "@/server/tariff";

type Meter = typeof meters.$inferSelect;
export const DUE_AFTER_DAYS = 15;

/** The tariff in force for a connection type on a date (latest effective_from ≤ date). */
async function tariffFor(connectionType: Meter["connectionType"], onDate: string) {
  const [t] = await db
    .select()
    .from(tariffs)
    .where(and(eq(tariffs.connectionType, connectionType), lte(tariffs.effectiveFrom, onDate)))
    .orderBy(desc(tariffs.effectiveFrom))
    .limit(1);
  return t ?? null;
}

export type CycleOutcome =
  | { ok: true; billNumber: string; units: number; totalPaise: number }
  | { ok: false; reason: string };

/**
 * Record a new cumulative reading for a meter and bill the period since the last reading.
 * Atomic: the reading and the bill are created together or not at all.
 */
export async function billNewReading(
  meter: Meter,
  newReadingKwh: number,
  readAt: string,
  source: "simulated" | "manual",
): Promise<CycleOutcome> {
  const [prev] = await db
    .select()
    .from(meterReadings)
    .where(eq(meterReadings.meterId, meter.id))
    .orderBy(desc(meterReadings.readAt))
    .limit(1);
  if (!prev) return { ok: false, reason: "no opening reading" };
  if (readAt <= prev.readAt)
    return { ok: false, reason: `reading date must be after ${prev.readAt}` };
  if (newReadingKwh < prev.readingKwh)
    return { ok: false, reason: `reading must be at least ${prev.readingKwh} kWh` };

  const tariff = await tariffFor(meter.connectionType, readAt);
  if (!tariff) return { ok: false, reason: `no ${meter.connectionType} tariff in force` };

  const units = newReadingKwh - prev.readingKwh;
  const amounts = calculateBill(units, tariff);
  const billNumber = `BL-${readAt.replaceAll("-", "")}-${meter.meterNumber}`;

  try {
    await db.transaction(async (tx) => {
      const [cur] = await tx
        .insert(meterReadings)
        .values({ meterId: meter.id, readingKwh: newReadingKwh, readAt, source })
        .returning();
      await tx.insert(bills).values({
        billNumber,
        meterId: meter.id,
        tariffId: tariff.id,
        periodStart: prev.readAt,
        periodEnd: readAt,
        previousReadingId: prev.id,
        currentReadingId: cur.id,
        ...amounts,
        dueDate: addDays(readAt, DUE_AFTER_DAYS),
      });
    });
  } catch (err) {
    // unique violations (same date/period already billed) are expected on re-runs
    if (isUniqueViolation(err)) return { ok: false, reason: "already billed for this date" };
    throw err;
  }
  return { ok: true, billNumber, units, totalPaise: amounts.totalPaise };
}

/** Typical monthly use for a meter (average of its last 3 bills), used to simulate a reading. */
async function typicalUnits(meterId: string): Promise<number> {
  const rows = await db
    .select({ units: bills.units })
    .from(bills)
    .where(eq(bills.meterId, meterId))
    .orderBy(desc(bills.periodEnd))
    .limit(3);
  if (rows.length === 0) return 150;
  return rows.reduce((a, r) => a + r.units, 0) / rows.length;
}

/** Simulate the next meter reading for every active meter and bill it. Safe to re-run. */
export async function runBillingCycle(readAt: string) {
  const active = await db.select().from(meters).where(eq(meters.status, "active"));
  const results: { meterNumber: string; outcome: CycleOutcome }[] = [];

  for (const meter of active) {
    const [prev] = await db
      .select({ kwh: meterReadings.readingKwh })
      .from(meterReadings)
      .where(eq(meterReadings.meterId, meter.id))
      .orderBy(desc(meterReadings.readAt))
      .limit(1);
    if (!prev) {
      results.push({
        meterNumber: meter.meterNumber,
        outcome: { ok: false, reason: "no opening reading" },
      });
      continue;
    }
    const use = Math.max(
      1,
      Math.round((await typicalUnits(meter.id)) * (0.85 + Math.random() * 0.3)),
    );
    results.push({
      meterNumber: meter.meterNumber,
      outcome: await billNewReading(meter, prev.kwh + use, readAt, "simulated"),
    });
  }
  return results;
}
