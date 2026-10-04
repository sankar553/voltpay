import type { Metadata } from "next";
import Link from "next/link";

import { CancelBillButton } from "@/components/admin/admin-forms";
import { Empty, Td, TableWrap, Thead } from "@/components/admin/table";
import { BillStateBadge } from "@/components/bill-state-badge";
import { Button } from "@/components/ui/button";
import { todayInIndia } from "@/lib/dues";
import { formatDate, formatINR } from "@/lib/money";
import { listBillsAdmin } from "@/server/admin";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Bills" };

const filters = [
  { value: undefined, label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default async function AdminBillsPage(props: PageProps<"/admin/bills">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const rows = await listBillsAdmin(status);
  const today = todayInIndia();

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {filters.map((f) => (
          <Button
            key={f.label}
            asChild
            size="sm"
            variant={f.value === status ? "default" : "outline"}
          >
            <Link href={f.value ? `/admin/bills?status=${f.value}` : "/admin/bills"}>
              {f.label}
            </Link>
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty>No bills match.</Empty>
      ) : (
        <div className="mt-4">
          <TableWrap>
            <Thead
              cols={[
                "Bill",
                "Consumer",
                "Period end",
                { label: "Amount", right: true },
                "Due",
                "Status",
                { label: "Action", hidden: true },
              ]}
            />
            <tbody className="divide-y">
              {rows.map(({ bill, meterNumber, consumerName }) => (
                <tr key={bill.id}>
                  <Td className="font-medium whitespace-nowrap">{bill.billNumber}</Td>
                  <Td className="whitespace-nowrap">
                    {consumerName} <span className="text-muted-foreground">· {meterNumber}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(bill.periodEnd)}</Td>
                  <Td className="text-right tabular-nums">{formatINR(bill.totalPaise)}</Td>
                  <Td className="whitespace-nowrap">{formatDate(bill.dueDate)}</Td>
                  <Td>
                    <BillStateBadge status={bill.status} dueDate={bill.dueDate} todayIso={today} />
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    {(bill.status === "unpaid" || bill.status === "overdue") && (
                      <CancelBillButton billId={bill.id} billNumber={bill.billNumber} />
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
