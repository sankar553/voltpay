import type { Metadata } from "next";

import { QrScanner } from "@/components/qr-scanner";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Scan meter QR" };

export default function ScanPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Scan your meter</h1>
      <p className="mt-2 mb-6 text-muted-foreground">
        We’ll find your meter and show the current bill.
      </p>
      <QrScanner appHost={new URL(env.NEXT_PUBLIC_APP_URL).host} />
    </div>
  );
}
