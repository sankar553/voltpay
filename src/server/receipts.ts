import "server-only";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { bills, meters, payments } from "@/db/schema";
import { ROLES } from "@/lib/auth";
import { maskName } from "@/lib/mask";
import { getSession } from "@/server/authz";
import { userOwnsMeter } from "@/server/billing";
import type { ReceiptData } from "@/server/receipt-pdf";

/**
 * Load a captured payment as receipt data. Receipts are reachable by their unguessable id
 * (so guests who paid can keep the link); consumer details are masked unless the viewer is
 * the payer, a linked meter holder, or an admin.
 */
export async function loadReceipt(paymentId: string): Promise<ReceiptData | null> {
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) return null;

  const [row] = await db
    .select({ payment: payments, bill: bills, meter: meters })
    .from(payments)
    .innerJoin(bills, eq(payments.billId, bills.id))
    .innerJoin(meters, eq(bills.meterId, meters.id))
    .where(and(eq(payments.id, paymentId), eq(payments.status, "captured")))
    .limit(1);
  if (!row || !row.payment.receiptNumber || !row.payment.capturedAt) return null;

  const session = await getSession();
  const full =
    !!session &&
    (session.user.role === ROLES.admin ||
      row.payment.userId === session.user.id ||
      (await userOwnsMeter(session.user.id, row.meter.id)));

  const { payment, bill, meter } = row;
  return {
    receiptNumber: payment.receiptNumber!,
    paidAt: payment.capturedAt!,
    method: payment.method,
    gateway: payment.gateway,
    transactionId: payment.gatewayPaymentId,
    consumerName: full ? meter.consumerName : maskName(meter.consumerName),
    meterNumber: meter.meterNumber,
    district: meter.district,
    billNumber: bill.billNumber,
    periodStart: bill.periodStart,
    periodEnd: bill.periodEnd,
    units: bill.units,
    energyPaise: bill.energyPaise,
    fixedPaise: bill.fixedPaise,
    dutyPaise: bill.dutyPaise,
    adjustmentPaise: bill.adjustmentPaise,
    totalPaise: bill.totalPaise,
  };
}
