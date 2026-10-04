import type { Metadata } from "next";

import { BillingCycleForm } from "@/components/admin/admin-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayInIndia } from "@/lib/dues";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Billing cycle" };

export default async function BillingPage() {
  await requireAdmin();
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Billing cycle</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Simulates the next meter reading for every active meter and creates its bill.
      </p>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Run a cycle</CardTitle>
          <CardDescription>
            Usage is simulated from each meter’s recent average (demo data). Meters already billed
            for that date, or without a tariff, are skipped, so it is safe to run again. Bills are
            due 15 days after the billing date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillingCycleForm today={todayInIndia()} />
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">
        For a single meter with a real reading, use <strong>Add a reading</strong> on the meter’s
        page.
      </p>
    </>
  );
}
