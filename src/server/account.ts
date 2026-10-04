import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { bills, complaints, meters, payments, profiles } from "@/db/schema";

/** Captured payments made by this user (guest payments aren't tied to an account). */
export async function listUserPayments(userId: string, limit = 100) {
  return db
    .select({
      id: payments.id,
      receiptNumber: payments.receiptNumber,
      amountPaise: payments.amountPaise,
      method: payments.method,
      capturedAt: payments.capturedAt,
      billNumber: bills.billNumber,
      meterNumber: meters.meterNumber,
    })
    .from(payments)
    .innerJoin(bills, eq(payments.billId, bills.id))
    .innerJoin(meters, eq(bills.meterId, meters.id))
    .where(and(eq(payments.userId, userId), eq(payments.status, "captured")))
    .orderBy(desc(payments.capturedAt))
    .limit(limit);
}

/** All bills for a meter (newest first) with the receipt id when paid. */
export async function listMeterBills(meterId: string) {
  return db
    .select({ bill: bills, paymentId: payments.id })
    .from(bills)
    .leftJoin(payments, and(eq(payments.billId, bills.id), eq(payments.status, "captured")))
    .where(eq(bills.meterId, meterId))
    .orderBy(desc(bills.periodEnd));
}

export async function listUserComplaints(userId: string) {
  return db
    .select({ complaint: complaints, meterNumber: meters.meterNumber })
    .from(complaints)
    .innerJoin(meters, eq(complaints.meterId, meters.id))
    .where(eq(complaints.userId, userId))
    .orderBy(desc(complaints.createdAt));
}

export async function getProfile(userId: string) {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return row ?? { userId, phone: null, address: null, notifyEmail: true };
}
