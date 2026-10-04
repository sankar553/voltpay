import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Payment gateway adapter.
 *  - "razorpay": real Razorpay (test or live keys) — Orders API + Checkout + HMAC verification.
 *  - "mock":     development-only stand-in used while the .env still has placeholder keys.
 *                Never available in production.
 */
export type Gateway = "razorpay" | "mock";

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Razorpay's checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  return safeEqualHex(hmacHex(keySecret, `${orderId}|${paymentId}`), signature);
}

/** Webhook signature: HMAC_SHA256(raw_body, webhook_secret) in X-Razorpay-Signature. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  return safeEqualHex(hmacHex(secret, rawBody), signature);
}

export function isRazorpayConfigured(): boolean {
  const id = env.RAZORPAY_KEY_ID;
  const secret = env.RAZORPAY_KEY_SECRET;
  return (
    /^rzp_(test|live)_[A-Za-z0-9]{8,}$/.test(id) &&
    !/placeholder/i.test(id) &&
    secret.length >= 10 &&
    !/placeholder/i.test(secret)
  );
}

export function activeGateway(): Gateway {
  if (isRazorpayConfigured()) return "razorpay";
  if (env.NODE_ENV === "production") {
    throw new Error("Razorpay keys are not configured; payments are disabled in production.");
  }
  return "mock";
}

export type GatewayOrder = { gateway: Gateway; orderId: string; keyId: string | null };

export async function createGatewayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<GatewayOrder> {
  const gateway = activeGateway();
  if (gateway === "mock") {
    return { gateway, orderId: `order_mock_${randomBytes(8).toString("hex")}`, keyId: null };
  }

  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    }),
  });
  if (!res.ok) {
    console.error("Razorpay order creation failed", res.status, await res.text());
    throw new Error("Could not start the payment. Please try again.");
  }
  const order = (await res.json()) as { id: string };
  return { gateway, orderId: order.id, keyId: env.RAZORPAY_KEY_ID };
}
