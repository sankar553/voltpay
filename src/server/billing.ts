import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { bills, meters, userMeters } from "@/db/schema";
import { verifyQrCode } from "@/server/qr";

/** Resolve a scanned QR code to a meter, or null if the code is forged / revoked. */
export async function findMeterByQrCode(code: string) {
  const token = verifyQrCode(decodeURIComponent(code));
  if (!token) return null;
  const [meter] = await db.select().from(meters).where(eq(meters.qrToken, token)).limit(1);
  return meter ?? null;
}

/** Oldest-first payable bill (unpaid or overdue) for a meter. */
export async function getPayableBill(meterId: string) {
  const [bill] = await db
    .select()
    .from(bills)
    .where(and(eq(bills.meterId, meterId), inArray(bills.status, ["unpaid", "overdue"])))
    .orderBy(desc(bills.periodEnd))
    .limit(1);
  return bill ?? null;
}

/** True when the user is linked to the meter — they may see full consumer details. */
export async function userOwnsMeter(userId: string | undefined, meterId: string) {
  if (!userId) return false;
  const [row] = await db
    .select({ userId: userMeters.userId })
    .from(userMeters)
    .where(and(eq(userMeters.userId, userId), eq(userMeters.meterId, meterId)))
    .limit(1);
  return !!row;
}
