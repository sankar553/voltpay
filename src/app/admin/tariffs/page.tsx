import type { Metadata } from "next";

import { TariffForm } from "@/components/admin/admin-forms";
import { Td, TableWrap, Thead } from "@/components/admin/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayInIndia } from "@/lib/dues";
import { formatDate, formatINR } from "@/lib/money";
import { listTariffs } from "@/server/admin";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Tariffs" };

function slabText(slabs: { uptoUnits: number | null; paisePerUnit: number }[]) {
  let lower = 0;
  return slabs
    .map((s) => {
      const label =
        s.uptoUnits === null ? `${lower}+` : `${lower + (lower === 0 ? 0 : 1)}–${s.uptoUnits}`;
      lower = s.uptoUnits ?? lower;
      return `${label}: ${formatINR(s.paisePerUnit)}`;
    })
    .join(" · ");
}

export default async function TariffsPage() {
  await requireAdmin();
  const rows = await listTariffs();
  const today = todayInIndia();

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Tariffs</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Demo values only — real tariffs come from the DISCOM/regulator. Existing bills never change;
        a new tariff applies to bills dated on or after its start date.
      </p>

      <TableWrap>
        <Thead cols={["Name", "Type", "From", "Slabs (₹ per unit)", "Fixed", "Duty"]} />
        <tbody className="divide-y">
          {rows.map((t) => (
            <tr key={t.id}>
              <Td className="font-medium whitespace-nowrap">{t.name}</Td>
              <Td className="capitalize">{t.connectionType}</Td>
              <Td className="whitespace-nowrap">{formatDate(t.effectiveFrom)}</Td>
              <Td className="text-muted-foreground">{slabText(t.slabs)}</Td>
              <Td className="whitespace-nowrap">{formatINR(t.fixedChargePaise)}</Td>
              <Td>{t.dutyBps / 100}%</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <Card className="mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle>Add a tariff</CardTitle>
          <CardDescription>Creates a new version; old ones stay for past bills.</CardDescription>
        </CardHeader>
        <CardContent>
          <TariffForm today={today} />
        </CardContent>
      </Card>
    </>
  );
}
