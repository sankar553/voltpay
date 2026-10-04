import { NextResponse } from "next/server";

import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { env } from "@/lib/env";
import { capturePayment, failPayment } from "@/server/payments/capture";
import { verifyWebhookSignature } from "@/server/payments/gateway";

/**
 * Razorpay webhook: keeps payment state correct even if the user closes the tab
 * before the browser callback. Signature-verified and idempotent (event id is unique).
 */
export async function POST(request: Request) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || /placeholder/i.test(secret)) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text(); // must be the raw bytes for HMAC
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id");
  if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

  let event: {
    event: string;
    payload?: { payment?: { entity?: Record<string, unknown> } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  // Record the event; if we've seen this id before, acknowledge without reprocessing.
  const inserted = await db
    .insert(webhookEvents)
    .values({ provider: "razorpay", eventId, type: event.event, payload: event })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  if (inserted.length === 0) return NextResponse.json({ ok: true, duplicate: true });

  const entity = event.payload?.payment?.entity as
    | { id: string; order_id: string; amount: number; method?: string; error_description?: string }
    | undefined;

  if (entity?.order_id) {
    if (event.event === "payment.captured") {
      await capturePayment({
        gatewayOrderId: entity.order_id,
        gatewayPaymentId: entity.id,
        method: entity.method,
        amountPaise: entity.amount,
      });
    } else if (event.event === "payment.failed") {
      await failPayment(entity.order_id, entity.error_description ?? "Payment failed");
    }
  }

  return NextResponse.json({ ok: true });
}
