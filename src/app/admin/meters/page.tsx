import { Plus, QrCode } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Empty, Td, TableWrap, Thead } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchMeters } from "@/server/admin";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Meters" };

export default async function MetersPage(props: PageProps<"/admin/meters">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const rows = await searchMeters(q);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Meters</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/qr">
              <QrCode aria-hidden /> QR sheet
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/meters/new">
              <Plus aria-hidden /> Add meter
            </Link>
          </Button>
        </div>
      </div>

      <form role="search" className="mt-6 flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search meter, consumer, name or district"
          aria-label="Search meters"
          className="sm:max-w-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <Empty>No meters found.</Empty>
      ) : (
        <div className="mt-4">
          <TableWrap>
            <Thead cols={["Meter", "Consumer", "Name", "District", "Type", "Status"]} />
            <tbody className="divide-y">
              {rows.map((m) => (
                <tr key={m.id}>
                  <Td className="font-medium whitespace-nowrap">
                    <Link href={`/admin/meters/${m.id}`} className="text-primary hover:underline">
                      {m.meterNumber}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{m.consumerNumber}</Td>
                  <Td>{m.consumerName}</Td>
                  <Td>{m.district}</Td>
                  <Td className="capitalize">{m.connectionType}</Td>
                  <Td>
                    <Badge variant={m.status === "active" ? "secondary" : "outline"}>
                      {m.status === "active" ? "Active" : "Disconnected"}
                    </Badge>
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
