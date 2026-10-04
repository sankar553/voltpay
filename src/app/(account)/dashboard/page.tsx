import { AlertTriangle, BarChart3, FileText, Link2, QrCode, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BillStateBadge } from "@/components/bill-state-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { billDisplayState, daysUntil, todayInIndia } from "@/lib/dues";
import { formatDate, formatINR } from "@/lib/money";
import { listUserPayments } from "@/server/account";
import { requireUser } from "@/server/authz";
import { listUserMeters } from "@/server/meters";
import { buildQrCode } from "@/server/qr";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user } = await requireUser("/dashboard");
  const today = todayInIndia();
  const [userMeters, recent] = await Promise.all([
    listUserMeters(user.id),
    listUserPayments(user.id, 3),
  ]);

  const payable = userMeters.filter((m) => m.bill);
  const totalDue = payable.reduce((sum, m) => sum + (m.bill?.totalPaise ?? 0), 0);
  const overdue = payable.filter(
    (m) => m.bill && billDisplayState(m.bill.status, m.bill.dueDate, today) === "overdue",
  );
  const dueSoon = payable.filter(
    (m) => m.bill && billDisplayState(m.bill.status, m.bill.dueDate, today) === "due_soon",
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hello, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-muted-foreground">
            {userMeters.length === 0
              ? "Link your first meter to see bills and usage."
              : totalDue > 0
                ? `You have ${formatINR(totalDue)} to pay across ${payable.length} meter${payable.length === 1 ? "" : "s"}.`
                : "You're all paid up."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/scan">
              <QrCode aria-hidden /> Scan &amp; pay
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/meters/link">
              <Link2 aria-hidden /> Link a meter
            </Link>
          </Button>
        </div>
      </div>

      {(overdue.length > 0 || dueSoon.length > 0) && (
        <div role="status" className="mt-6 grid gap-2">
          {overdue.map(({ meter, bill }) => (
            <div
              key={meter.id}
              className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
            >
              <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
              <span>
                <strong>Overdue:</strong> meter {meter.meterNumber} — {formatINR(bill!.totalPaise)}{" "}
                was due on {formatDate(bill!.dueDate)}.
              </span>
            </div>
          ))}
          {dueSoon.map(({ meter, bill }) => {
            const days = daysUntil(bill!.dueDate, today);
            return (
              <div
                key={meter.id}
                className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
              >
                <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
                <span>
                  <strong>
                    Due {days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}:
                  </strong>{" "}
                  meter {meter.meterNumber} — {formatINR(bill!.totalPaise)} by{" "}
                  {formatDate(bill!.dueDate)}.
                </span>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold">Your meters</h2>
      {userMeters.length === 0 ? (
        <Card className="mt-3">
          <CardHeader>
            <CardTitle>No meters linked yet</CardTitle>
            <CardDescription>
              Link a meter with its consumer number and your last paid bill amount.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/meters/link">Link a meter</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {userMeters.map(({ meter, bill, relation }) => (
            <Card key={meter.id} className="gap-4">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{meter.consumerName}</CardTitle>
                    <CardDescription className="mt-1">
                      Meter {meter.meterNumber} · {meter.district} · {relation}
                    </CardDescription>
                  </div>
                  {bill && (
                    <BillStateBadge status={bill.status} dueDate={bill.dueDate} todayIso={today} />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {bill ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="block text-2xl font-bold text-foreground tabular-nums">
                      {formatINR(bill.totalPaise)}
                    </span>
                    {bill.units} kWh · due {formatDate(bill.dueDate)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No pending bills.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {bill && (
                    <Button asChild size="sm" variant="accent">
                      <Link href={`/m/${buildQrCode(meter.qrToken)}`}>View &amp; pay</Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/meters/${meter.id}/bills`}>
                      <FileText aria-hidden /> Bills
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/meters/${meter.id}/usage`}>
                      <BarChart3 aria-hidden /> Usage
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent payments</h2>
        {recent.length > 0 && (
          <Link href="/payments" className="text-sm text-primary hover:underline">
            View all
          </Link>
        )}
      </div>
      {recent.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <ul className="mt-3 divide-y rounded-xl border bg-card">
          {recent.map((p) => (
            <li key={p.id}>
              <Link
                href={`/receipts/${p.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-secondary/60"
              >
                <span className="flex items-center gap-3 text-sm">
                  <Receipt className="size-4 text-muted-foreground" aria-hidden />
                  <span>
                    {p.billNumber}
                    <span className="block text-xs text-muted-foreground">
                      {p.capturedAt ? formatDate(p.capturedAt) : ""}
                    </span>
                  </span>
                </span>
                <span className="font-medium tabular-nums">{formatINR(p.amountPaise)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
