import { eq } from "drizzle-orm";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PayButton } from "@/components/pay-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { meterReadings } from "@/db/schema";
import { maskName } from "@/lib/mask";
import { formatDate, formatINR } from "@/lib/money";
import { getSession } from "@/server/authz";
import { findMeterByQrCode, getPayableBill, userOwnsMeter } from "@/server/billing";

export const metadata: Metadata = { title: "Your bill" };

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={strong ? "text-lg font-semibold tabular-nums" : "text-sm tabular-nums"}>
        {value}
      </dd>
    </div>
  );
}

export default async function MeterBillPage(props: PageProps<"/m/[code]">) {
  const { code } = await props.params;
  const meter = await findMeterByQrCode(code);

  if (!meter) {
    return (
      <div className="mx-auto grid max-w-md flex-1 place-items-center px-4 py-20 text-center">
        <div>
          <ShieldAlert className="mx-auto size-10 text-destructive" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold">Not a valid meter QR</h1>
          <p className="mt-2 text-muted-foreground">
            This code is invalid or has been replaced. Check the sticker on your meter, or enter
            your consumer number instead.
          </p>
          <Button asChild className="mt-6">
            <Link href="/scan">Try again</Link>
          </Button>
        </div>
      </div>
    );
  }

  const session = await getSession();
  const [bill, owner] = await Promise.all([
    getPayableBill(meter.id),
    userOwnsMeter(session?.user.id, meter.id),
  ]);

  const readings = bill
    ? await Promise.all(
        [bill.previousReadingId, bill.currentReadingId].map((id) =>
          db
            .select()
            .from(meterReadings)
            .where(eq(meterReadings.id, id))
            .limit(1)
            .then((r) => r[0]),
        ),
      )
    : [];

  const overdue = bill?.status === "overdue";

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>Meter {meter.meterNumber}</CardDescription>
              <CardTitle className="mt-1 text-2xl">
                {owner ? meter.consumerName : maskName(meter.consumerName)}
              </CardTitle>
              <CardDescription className="mt-1">
                {owner ? `${meter.address}, ` : ""}
                {meter.district} · {meter.connectionType}
              </CardDescription>
            </div>
            {bill && (
              <Badge
                variant={overdue ? "outline" : "secondary"}
                className={overdue ? "text-destructive" : ""}
              >
                {overdue ? "Overdue" : "Unpaid"}
              </Badge>
            )}
          </div>
          {!owner && (
            <p className="text-xs text-muted-foreground">
              Details are partly hidden.{" "}
              {session ? (
                <>
                  Is this your meter?{" "}
                  <Link
                    href="/meters/link"
                    className="text-primary underline underline-offset-4 hover:no-underline"
                  >
                    Link it to your account
                  </Link>
                  .
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-primary underline underline-offset-4 hover:no-underline"
                  >
                    Sign in
                  </Link>{" "}
                  as the meter holder to see everything.
                </>
              )}
            </p>
          )}
          {owner && (
            <p className="flex gap-4 text-xs">
              <Link
                href={`/meters/${meter.id}/bills`}
                className="text-primary underline underline-offset-4 hover:no-underline"
              >
                Bill history
              </Link>
              <Link
                href={`/meters/${meter.id}/usage`}
                className="text-primary underline underline-offset-4 hover:no-underline"
              >
                Usage
              </Link>
            </p>
          )}
        </CardHeader>

        <CardContent>
          {bill ? (
            <>
              <dl className="divide-y rounded-lg border px-4">
                <Row label="Bill number" value={bill.billNumber} />
                <Row
                  label="Billing period"
                  value={`${formatDate(bill.periodStart)} – ${formatDate(bill.periodEnd)}`}
                />
                {readings[0] && readings[1] && (
                  <Row
                    label="Meter reading"
                    value={`${readings[0].readingKwh} → ${readings[1].readingKwh} kWh`}
                  />
                )}
                <Row label="Units consumed" value={`${bill.units} kWh`} />
                <Row label="Energy charges" value={formatINR(bill.energyPaise)} />
                <Row label="Fixed charges" value={formatINR(bill.fixedPaise)} />
                <Row label="Electricity duty" value={formatINR(bill.dutyPaise)} />
                {bill.adjustmentPaise !== 0 && (
                  <Row label="Adjustments" value={formatINR(bill.adjustmentPaise)} />
                )}
                <Row label="Due date" value={formatDate(bill.dueDate)} />
                <Row label="Amount payable" value={formatINR(bill.totalPaise)} strong />
              </dl>
              <div className="mt-6">
                <PayButton
                  billId={bill.id}
                  label={`Pay ${formatINR(bill.totalPaise)}`}
                  customer={
                    session ? { name: session.user.name, email: session.user.email } : undefined
                  }
                />
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Prototype: payments run in test mode — no real money is charged.
                </p>
              </div>
            </>
          ) : (
            <div className="grid justify-items-center gap-2 py-8 text-center">
              <CheckCircle2 className="size-10 text-success" aria-hidden />
              <p className="text-lg font-semibold">You’re all paid up</p>
              <p className="text-sm text-muted-foreground">
                There are no pending bills for this meter.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
