import { describe, expect, it } from "vitest";

import {
  hmacHex,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "@/server/payments/gateway";

describe("Razorpay signatures", () => {
  const secret = "test_secret_value_123";

  it("accepts a correct checkout signature", () => {
    const sig = hmacHex(secret, "order_ABC|pay_XYZ");
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", sig, secret)).toBe(true);
  });

  it("rejects a signature for a different payment or secret", () => {
    const sig = hmacHex(secret, "order_ABC|pay_XYZ");
    expect(verifyCheckoutSignature("order_ABC", "pay_OTHER", sig, secret)).toBe(false);
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", sig, "wrong_secret_value")).toBe(false);
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", "", secret)).toBe(false);
  });

  it("verifies webhook bodies byte-for-byte", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = hmacHex(secret, body);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, secret)).toBe(false);
  });
});
