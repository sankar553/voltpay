import type { Metadata } from "next";
import Link from "next/link";

import { formatDate, formatINR } from "@/lib/money";
import { listUserPayments } from "@/server/account";
import { requireUser } from "@/server/authz";

export const metadata: Metadata = { title: "Payment history" };

const methodLabel = (m: string | null) =>
  ({ upi: "UPI", card: "Card", netbanking: "Net banking", mock: "Simulated", wallet: "Wallet" })[
    m ?? ""
  ] ??
  m ??
  "—";

export default async function PaymentsPage() {
  const { user } = await requireUser("/payments");
  const rows = await listUserPayments(user.id);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Payment history</h1>
      <p className="mt-1 text-muted-foreground">Payments made while signed in to your account.</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          No payments yet.{" "}
          <Link href="/scan" className="text-primary hover:underline">
            Scan a meter
          </Link>{" "}
          to pay your first bill.
        </p>
      ) : (
        <div className="relative mt-6 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Bill</th>
                <th className="px-4 py-3 font-medium">Meter</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Receipt</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.capturedAt ? formatDate(p.capturedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{p.billNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{p.meterNumber}</td>
                  <td className="px-4 py-3">{methodLabel(p.method)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatINR(p.amountPaise)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/receipts/${p.id}`} className="text-primary hover:underline">
                      Receipt
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
