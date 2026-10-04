import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { auditLog, bills, payments } from "@/db/schema";

function newReceiptNumber(): string {
  const d = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `VP-${d}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export type CaptureResult =
  | { ok: true; paymentId: string; alreadyCaptured: boolean }
  | { ok: false; reason: "not_found" | "amount_mismatch" };

/**
 * Mark an order as paid. Idempotent: the browser callback and the webhook can both call this;
 * only the first one changes anything. Payment + bill + audit log update in one transaction.
 */
export async function capturePayment(input: {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  method?: string | null;
  amountPaise?: number; // from webhook payload, when available
}): Promise<CaptureResult> {
  return db.transaction(async (tx) => {
    // Lock the payment row so concurrent callbacks serialize.
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.gatewayOrderId, input.gatewayOrderId))
      .for("update");

    if (!payment) return { ok: false, reason: "not_found" } as const;
    if (payment.status === "captured") {
      return { ok: true, paymentId: payment.id, alreadyCaptured: true } as const;
    }
    if (input.amountPaise !== undefined && input.amountPaise !== payment.amountPaise) {
      return { ok: false, reason: "amount_mismatch" } as const;
    }

    await tx
      .update(payments)
      .set({
        status: "captured",
        gatewayPaymentId: input.gatewayPaymentId,
        method: input.method ?? payment.method,
        receiptNumber: newReceiptNumber(),
        capturedAt: new Date(),
        failureReason: null,
      })
      .where(eq(payments.id, payment.id));

    await tx
      .update(bills)
      .set({ status: "paid", paidAt: new Date() })
      .where(and(eq(bills.id, payment.billId), ne(bills.status, "cancelled")));

    await tx.insert(auditLog).values({
      actorUserId: payment.userId,
      action: "payment.captured",
      entity: "payment",
      entityId: payment.id,
      meta: { billId: payment.billId, amountPaise: payment.amountPaise, gateway: payment.gateway },
    });

    return { ok: true, paymentId: payment.id, alreadyCaptured: false } as const;
  });
}

export async function failPayment(gatewayOrderId: string, reason: string) {
  await db
    .update(payments)
    .set({ status: "failed", failureReason: reason.slice(0, 300) })
    .where(and(eq(payments.gatewayOrderId, gatewayOrderId), ne(payments.status, "captured")));
}
