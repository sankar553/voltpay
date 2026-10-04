import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BillStateBadge } from "@/components/bill-state-badge";
import { MeterHeader } from "@/components/meter-header";
import { Button } from "@/components/ui/button";
import { todayInIndia } from "@/lib/dues";
import { formatDate, formatINR } from "@/lib/money";
import { listMeterBills } from "@/server/account";
import { requireUser } from "@/server/authz";
import { getOwnedMeter } from "@/server/meters";
import { buildQrCode } from "@/server/qr";

export const metadata: Metadata = { title: "Bill history" };

export default async function BillsPage(props: PageProps<"/meters/[id]/bills">) {
  const { id } = await props.params;
  const { user } = await requireUser(`/meters/${id}/bills`);
  const owned = await getOwnedMeter(user.id, id);
  if (!owned) notFound();
  const { meter } = owned;

  const rows = await listMeterBills(meter.id);
  const today = todayInIndia();

  return (
    <>
      <MeterHeader
        meterId={meter.id}
        consumerName={meter.consumerName}
        meterNumber={meter.meterNumber}
        district={meter.district}
        active="bills"
      />
      <div className="relative overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Bill</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 text-right font-medium">Units</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ bill, paymentId }) => (
              <tr key={bill.id}>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{bill.billNumber}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {formatDate(bill.periodStart)} – {formatDate(bill.periodEnd)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{bill.units}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {formatINR(bill.totalPaise)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(bill.dueDate)}</td>
                <td className="px-4 py-3">
                  <BillStateBadge status={bill.status} dueDate={bill.dueDate} todayIso={today} />
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {bill.status === "paid" && paymentId ? (
                    <Link href={`/receipts/${paymentId}`} className="text-primary hover:underline">
                      Receipt
                    </Link>
                  ) : bill.status === "unpaid" || bill.status === "overdue" ? (
                    <Button asChild size="sm" variant="accent">
                      <Link href={`/m/${buildQrCode(meter.qrToken)}`}>Pay</Link>
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
