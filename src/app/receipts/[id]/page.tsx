import { CheckCircle2, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatINR } from "@/lib/money";
import { loadReceipt } from "@/server/receipts";

export const metadata: Metadata = { title: "Payment receipt" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm tabular-nums">{value}</dd>
    </div>
  );
}

export default async function ReceiptPage(props: PageProps<"/receipts/[id]">) {
  const { id } = await props.params;
  const r = await loadReceipt(id);
  if (!r) notFound();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <div className="mb-6 grid justify-items-center gap-2 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden />
        <h1 className="text-2xl font-bold">Payment successful</h1>
        <p className="text-3xl font-bold tabular-nums">{formatINR(r.totalPaise)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receipt {r.receiptNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row label="Paid on" value={formatDate(r.paidAt)} />
            <Row label="Consumer" value={r.consumerName} />
            <Row label="Meter" value={`${r.meterNumber} · ${r.district}`} />
            <Row label="Bill" value={r.billNumber} />
            <Row
              label="Period"
              value={`${formatDate(r.periodStart)} – ${formatDate(r.periodEnd)}`}
            />
            <Row label="Units" value={`${r.units} kWh`} />
            <Row label="Method" value={r.method ?? "—"} />
            <Row label="Transaction ID" value={r.transactionId ?? "—"} />
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="flex-1">
              <a href={`/receipts/${id}/pdf`} download>
                <Download aria-hidden /> Download PDF
              </a>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
