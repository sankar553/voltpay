import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatINR } from "@/lib/money";
import { adminOverview } from "@/server/admin";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const o = await adminOverview();

  const stats = [
    { label: "Customers", value: String(o.customers) },
    { label: "Meters", value: String(o.meters) },
    {
      label: "Outstanding",
      value: formatINR(o.outstandingPaise),
      sub: `${o.outstandingBills} unpaid bills`,
    },
    { label: "Collected this month", value: formatINR(o.collectedPaise) },
    {
      label: "Open complaints",
      value: String(o.openComplaints),
      href: "/admin/complaints?status=open",
    },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Admin console</h1>
      <p className="mt-1 text-muted-foreground">
        Meters, billing, payments and complaints at a glance.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => {
          const card = (
            <Card className="h-full gap-1">
              <CardHeader>
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{s.value}</CardTitle>
                {s.sub && <CardDescription>{s.sub}</CardDescription>}
              </CardHeader>
            </Card>
          );
          return s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {card}
            </Link>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Recent payments</h2>
      {o.recent.length === 0 ? (
        <p className="mt-2 text-muted-foreground">No payments yet.</p>
      ) : (
        <div className="mt-3 divide-y rounded-xl border bg-card">
          {o.recent.map(({ payment: p, billNumber, meterNumber }) => (
            <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{billNumber}</p>
                <p className="text-muted-foreground">
                  {meterNumber} · {p.capturedAt ? formatDate(p.capturedAt) : "—"} · {p.gateway}
                </p>
              </div>
              <span className="font-semibold tabular-nums">{formatINR(p.amountPaise)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
