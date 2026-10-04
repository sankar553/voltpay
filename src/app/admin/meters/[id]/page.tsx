import QRCode from "qrcode";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MeterForm, ReadingForm, RotateQrButton } from "@/components/admin/admin-forms";
import { Td, TableWrap, Thead } from "@/components/admin/table";
import { BillStateBadge } from "@/components/bill-state-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayInIndia } from "@/lib/dues";
import { formatDate, formatINR } from "@/lib/money";
import { getMeterDetail } from "@/server/admin";
import { requireAdmin } from "@/server/authz";
import { qrUrl } from "@/server/qr";

export const metadata: Metadata = { title: "Meter" };

export default async function AdminMeterPage(props: PageProps<"/admin/meters/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const detail = await getMeterDetail(id);
  if (!detail) notFound();
  const { meter, recentBills, linkedUsers } = detail;

  const today = todayInIndia();
  const svg = await QRCode.toString(qrUrl(meter.qrToken), { type: "svg", margin: 1, width: 200 });

  return (
    <>
      <Link href="/admin/meters" className="text-sm text-primary hover:underline">
        ← Meters
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{meter.meterNumber}</h1>
      <p className="mt-1 text-muted-foreground">
        Consumer {meter.consumerNumber} · {linkedUsers} linked account{linkedUsers === 1 ? "" : "s"}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_16rem]">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <MeterForm
              meter={{
                id: meter.id,
                consumerName: meter.consumerName,
                address: meter.address,
                district: meter.district,
                connectionType: meter.connectionType,
                sanctionedLoadKw: meter.sanctionedLoadKw,
                status: meter.status,
              }}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>QR sticker</CardTitle>
            <CardDescription>
              {meter.qrTokenRotatedAt
                ? `Rotated ${formatDate(meter.qrTokenRotatedAt)}`
                : "Original code"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div
              className="mx-auto w-fit rounded-lg border bg-white p-2"
              aria-label={`QR code for meter ${meter.meterNumber}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <RotateQrButton meterId={meter.id} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Add a reading</CardTitle>
          <CardDescription>
            Bills the units used since the previous reading at the tariff in force.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meter.status === "active" ? (
            <ReadingForm meterId={meter.id} today={today} />
          ) : (
            <p className="text-sm text-muted-foreground">
              This meter is disconnected. Reconnect it to bill it.
            </p>
          )}
        </CardContent>
      </Card>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Recent bills</h2>
      {recentBills.length === 0 ? (
        <p className="text-muted-foreground">No bills yet.</p>
      ) : (
        <TableWrap>
          <Thead cols={["Bill", "Units", { label: "Amount", right: true }, "Due", "Status"]} />
          <tbody className="divide-y">
            {recentBills.map((b) => (
              <tr key={b.id}>
                <Td className="font-medium whitespace-nowrap">{b.billNumber}</Td>
                <Td className="tabular-nums">{b.units}</Td>
                <Td className="text-right tabular-nums">{formatINR(b.totalPaise)}</Td>
                <Td className="whitespace-nowrap">{formatDate(b.dueDate)}</Td>
                <Td>
                  <BillStateBadge status={b.status} dueDate={b.dueDate} todayIso={today} />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
