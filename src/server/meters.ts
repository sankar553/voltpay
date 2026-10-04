import "server-only";
import { and, count, desc, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { auditLog, bills, meters, userMeters } from "@/db/schema";
import { getPayableBill, userOwnsMeter } from "@/server/billing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Meters linked to a user, each with its current payable bill (if any). */
export async function listUserMeters(userId: string) {
  const rows = await db
    .select({ meter: meters, relation: userMeters.relation })
    .from(userMeters)
    .innerJoin(meters, eq(userMeters.meterId, meters.id))
    .where(eq(userMeters.userId, userId))
    .orderBy(meters.meterNumber);

  return Promise.all(rows.map(async (r) => ({ ...r, bill: await getPayableBill(r.meter.id) })));
}

/** The meter, only if this user is linked to it — otherwise null (callers respond 404). */
export async function getOwnedMeter(userId: string, meterId: string) {
  if (!UUID.test(meterId)) return null;
  const [row] = await db
    .select({ meter: meters, relation: userMeters.relation })
    .from(userMeters)
    .innerJoin(meters, eq(userMeters.meterId, meters.id))
    .where(and(eq(userMeters.userId, userId), eq(userMeters.meterId, meterId)))
    .limit(1);
  return row ?? null;
}

const MAX_FAILED_LINKS = 5;
const LINK_WINDOW_MS = 15 * 60 * 1000;

export type LinkResult =
  { ok: true; meterId: string; alreadyLinked: boolean } | { ok: false; error: string };

/**
 * Link a meter to a user. Prototype-grade proof of holding the bill: the consumer number plus
 * the amount of the last paid bill. (A real service would send an OTP to the registered mobile.)
 * Failed attempts are throttled per user and never reveal whether the consumer number exists.
 */
export async function linkMeter(input: {
  userId: string;
  consumerNumber: string;
  amountPaise: number;
  relation: "owner" | "family" | "tenant";
}): Promise<LinkResult> {
  const { userId } = input;

  const [{ n: failures }] = await db
    .select({ n: count() })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.actorUserId, userId),
        eq(auditLog.action, "meter.link_failed"),
        gt(auditLog.createdAt, new Date(Date.now() - LINK_WINDOW_MS)),
      ),
    );
  if (failures >= MAX_FAILED_LINKS) {
    return { ok: false, error: "Too many failed attempts. Please try again in 15 minutes." };
  }

  const [meter] = await db
    .select()
    .from(meters)
    .where(eq(meters.consumerNumber, input.consumerNumber.trim().toUpperCase()))
    .limit(1);

  let expected: number | null = null;
  if (meter) {
    const lastBills = await db
      .select({ total: bills.totalPaise, status: bills.status })
      .from(bills)
      .where(eq(bills.meterId, meter.id))
      .orderBy(desc(bills.periodEnd));
    expected = (lastBills.find((b) => b.status === "paid") ?? lastBills[0])?.total ?? null;
  }

  if (!meter || expected === null || expected !== input.amountPaise) {
    await db.insert(auditLog).values({
      actorUserId: userId,
      action: "meter.link_failed",
      entity: "meter",
      entityId: meter?.id ?? null,
    });
    return {
      ok: false,
      error:
        "Those details don't match our records. Check the consumer number and the amount of your last paid bill.",
    };
  }

  const alreadyLinked = await userOwnsMeter(userId, meter.id);
  if (!alreadyLinked) {
    await db
      .insert(userMeters)
      .values({ userId, meterId: meter.id, relation: input.relation })
      .onConflictDoNothing();
    await db.insert(auditLog).values({
      actorUserId: userId,
      action: "meter.linked",
      entity: "meter",
      entityId: meter.id,
      meta: { relation: input.relation },
    });
  }
  return { ok: true, meterId: meter.id, alreadyLinked };
}
