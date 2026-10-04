import type { Metadata } from "next";
import Link from "next/link";

import { Empty, Td, TableWrap, Thead } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatINR } from "@/lib/money";
import { listPaymentsAdmin } from "@/server/admin";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const rows = await listPaymentsAdmin();

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
      <p className="mt-1 text-muted-foreground">
        Latest 100 payment attempts, including abandoned and failed ones.
      </p>
      {rows.length === 0 ? (
        <Empty>No payments yet.</Empty>
      ) : (
        <div className="mt-4">
          <TableWrap>
            <Thead
              cols={[
                "Date",
                "Bill",
                "Payer",
                { label: "Amount", right: true },
                "Method",
                "Gateway",
                "Status",
              ]}
            />
            <tbody className="divide-y">
              {rows.map(({ payment: p, billNumber, meterNumber, email }) => (
                <tr key={p.id}>
                  <Td className="whitespace-nowrap">{formatDate(p.capturedAt ?? p.createdAt)}</Td>
                  <Td className="whitespace-nowrap">
                    <span className="font-medium">{billNumber}</span>{" "}
                    <span className="text-muted-foreground">· {meterNumber}</span>
                  </Td>
                  <Td className="text-muted-foreground">{email ?? "Guest"}</Td>
                  <Td className="text-right tabular-nums">{formatINR(p.amountPaise)}</Td>
                  <Td className="uppercase">{p.method ?? "—"}</Td>
                  <Td>{p.gateway}</Td>
                  <Td>
                    {p.status === "captured" ? (
                      <Link href={`/receipts/${p.id}`} className="text-primary hover:underline">
                        Captured
                      </Link>
                    ) : (
                      <Badge variant="outline">{p.status}</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}
    </>
  );
}
