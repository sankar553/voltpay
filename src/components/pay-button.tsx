"use client";

import { Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";

import {
  confirmMockPayment,
  reportPaymentFailure,
  startPayment,
  verifyRazorpayPayment,
} from "@/app/actions/payment";
import { Button } from "@/components/ui/button";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, cb: (r: { error?: { description?: string } }) => void): void;
    };
  }
}

export function PayButton({
  billId,
  label,
  customer,
}: {
  billId: string;
  label: string;
  customer?: { name?: string; email?: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = (paymentId: string) => router.push(`/receipts/${paymentId}`);

  async function pay() {
    setError(null);
    setBusy(true);
    const start = await startPayment({ billId });
    if (!start.ok) {
      setError(start.error);
      setBusy(false);
      return;
    }

    if (start.gateway === "mock") {
      const res = await confirmMockPayment({ orderId: start.orderId });
      if (res.ok) return done(res.paymentId);
      setError(res.error);
      setBusy(false);
      return;
    }

    if (!window.Razorpay) {
      setError("Payment window failed to load. Check your connection and retry.");
      setBusy(false);
      return;
    }

    const rzp = new window.Razorpay({
      key: start.keyId,
      amount: start.amountPaise,
      currency: "INR",
      name: "VoltPay",
      description: start.description,
      order_id: start.orderId,
      prefill: customer,
      theme: { color: "#1d4ed8" },
      handler: async (r: RazorpayResponse) => {
        const res = await verifyRazorpayPayment({
          orderId: r.razorpay_order_id,
          paymentId: r.razorpay_payment_id,
          signature: r.razorpay_signature,
        });
        if (res.ok) return done(res.paymentId);
        setError(res.error);
        setBusy(false);
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.on("payment.failed", (r) => {
      const reason = r.error?.description ?? "Payment failed";
      void reportPaymentFailure({ orderId: start.orderId, reason });
      setError(reason);
      setBusy(false);
    });
    rzp.open();
  }

  return (
    <div className="grid gap-3">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Button size="lg" variant="accent" onClick={pay} disabled={busy} className="w-full">
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Lock aria-hidden />}
        {busy ? "Processing…" : label}
      </Button>
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
