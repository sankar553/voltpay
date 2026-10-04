"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { bills, payments } from "@/db/schema";
import { env } from "@/lib/env";
import { getSession } from "@/server/authz";
import { capturePayment, failPayment } from "@/server/payments/capture";
import { clientIp, rateLimit } from "@/server/rate-limit";
import {
  createGatewayOrder,
  verifyCheckoutSignature,
  type Gateway,
} from "@/server/payments/gateway";

type StartResult =
  | {
      ok: true;
      paymentId: string;
      gateway: Gateway;
      orderId: string;
      keyId: string | null;
      amountPaise: number;
      description: string;
    }
  | { ok: false; error: string };

/**
 * Step 1: create a gateway order for a bill. The amount always comes from the
 * database — the client only says WHICH bill.
 */
export async function startPayment(input: { billId: string }): Promise<StartResult> {
  const parsed = z.object({ billId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid bill." };

  // Each call creates a gateway order, so cap how fast one client can do it.
  const limit = await rateLimit(`pay:${await clientIp()}`, 10, 60);
  if (!limit.ok) return { ok: false, error: "Too many payment attempts. Please wait a minute." };

  const [bill] = await db.select().from(bills).where(eq(bills.id, parsed.data.billId)).limit(1);
  if (!bill) return { ok: false, error: "Bill not found." };
  if (bill.status === "paid") return { ok: false, error: "This bill is already paid." };
  if (bill.status === "cancelled") return { ok: false, error: "This bill was cancelled." };

  const session = await getSession();
  try {
    const order = await createGatewayOrder({
      amountPaise: bill.totalPaise,
      receipt: bill.billNumber,
      notes: { billId: bill.id, billNumber: bill.billNumber },
    });

    const [payment] = await db
      .insert(payments)
      .values({
        billId: bill.id,
        userId: session?.user.id ?? null,
        amountPaise: bill.totalPaise,
        gateway: order.gateway,
        gatewayOrderId: order.orderId,
      })
      .returning({ id: payments.id });

    return {
      ok: true,
      paymentId: payment.id,
      gateway: order.gateway,
      orderId: order.orderId,
      keyId: order.keyId,
      amountPaise: bill.totalPaise,
      description: `Electricity bill ${bill.billNumber}`,
    };
  } catch (err) {
    console.error("startPayment failed", err);
    return { ok: false, error: "Could not start the payment. Please try again." };
  }
}

type FinishResult = { ok: true; paymentId: string } | { ok: false; error: string };

/** Step 2 (Razorpay): verify the checkout signature, then mark the bill paid. */
export async function verifyRazorpayPayment(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<FinishResult> {
  const parsed = z
    .object({
      orderId: z.string().min(5),
      paymentId: z.string().min(5),
      signature: z.string().min(10),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payment response." };

  const { orderId, paymentId, signature } = parsed.data;
  if (!verifyCheckoutSignature(orderId, paymentId, signature, env.RAZORPAY_KEY_SECRET)) {
    await failPayment(orderId, "Signature verification failed");
    return { ok: false, error: "Payment could not be verified." };
  }

  const result = await capturePayment({ gatewayOrderId: orderId, gatewayPaymentId: paymentId });
  return result.ok
    ? { ok: true, paymentId: result.paymentId }
    : { ok: false, error: "Payment record not found." };
}

/** Step 2 (mock gateway, development only): simulate a successful checkout. */
export async function confirmMockPayment(input: { orderId: string }): Promise<FinishResult> {
  if (env.NODE_ENV === "production") return { ok: false, error: "Not available." };
  const parsed = z.object({ orderId: z.string().startsWith("order_mock_") }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid order." };

  const result = await capturePayment({
    gatewayOrderId: parsed.data.orderId,
    gatewayPaymentId: `pay_mock_${Date.now().toString(36)}`,
    method: "mock",
  });
  return result.ok
    ? { ok: true, paymentId: result.paymentId }
    : { ok: false, error: "Payment record not found." };
}

export async function reportPaymentFailure(input: { orderId: string; reason: string }) {
  const parsed = z
    .object({ orderId: z.string().min(5), reason: z.string().max(300) })
    .safeParse(input);
  if (parsed.success) await failPayment(parsed.data.orderId, parsed.data.reason);
}
