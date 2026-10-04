import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MeterHeader } from "@/components/meter-header";
import { UsageChart } from "@/components/usage-chart";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usageStats } from "@/lib/usage";
import { listMeterBills } from "@/server/account";
import { requireUser } from "@/server/authz";
import { getOwnedMeter } from "@/server/meters";

export const metadata: Metadata = { title: "Usage" };

const monthLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function UsagePage(props: PageProps<"/meters/[id]/usage">) {
  const { id } = await props.params;
  const { user } = await requireUser(`/meters/${id}/usage`);
  const owned = await getOwnedMeter(user.id, id);
  if (!owned) notFound();
  const { meter } = owned;

  // Oldest → newest. Each bill's units were consumed during its period, so label by period start.
  const rows = (await listMeterBills(meter.id))
    .filter((r) => r.bill.status !== "cancelled")
    .reverse();
  const points = rows.map((r) => ({ label: monthLabel(r.bill.periodStart), units: r.bill.units }));
  const stats = usageStats(points.map((p) => p.units));
  const trend = stats.trendPercent;
  const TrendIcon =
    trend === null || trend === 0 ? Minus : trend > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <>
      <MeterHeader
        meterId={meter.id}
        consumerName={meter.consumerName}
        meterNumber={meter.meterNumber}
        district={meter.district}
        active="usage"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-1 py-4">
          <CardHeader>
            <CardDescription>Average per month</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.average} kWh</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-1 py-4">
          <CardHeader>
            <CardDescription>
              Highest{stats.maxIndex >= 0 ? ` (${points[stats.maxIndex].label})` : ""}
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.max} kWh</CardTitle>
          </CardHeader>
        </Card>
        <Card className="gap-1 py-4">
          <CardHeader>
            <CardDescription>Latest month</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.latest} kWh</CardTitle>
            {trend !== null && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendIcon className="size-3.5" aria-hidden />
                {trend > 0 ? "+" : ""}
                {trend}% vs previous month
              </p>
            )}
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-4 p-6">
        <UsageChart points={points} />
      </Card>
    </>
  );
}
