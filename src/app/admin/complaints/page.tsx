import type { Metadata } from "next";
import Link from "next/link";

import { ComplaintUpdateForm } from "@/components/admin/admin-forms";
import { Empty } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/money";
import { listComplaintsAdmin } from "@/server/admin";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Complaints" };

const categoryLabel = {
  billing: "Billing",
  meter_fault: "Meter fault",
  supply: "Power supply",
  other: "Other",
} as const;
const statusLabel = { open: "Open", in_progress: "In progress", resolved: "Resolved" } as const;
const filters = [
  { value: undefined, label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
] as const;

export default async function AdminComplaintsPage(props: PageProps<"/admin/complaints">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const rows = await listComplaintsAdmin(status);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Complaints</h1>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {filters.map((f) => (
          <Button
            key={f.label}
            asChild
            size="sm"
            variant={f.value === status ? "default" : "outline"}
          >
            <Link href={f.value ? `/admin/complaints?status=${f.value}` : "/admin/complaints"}>
              {f.label}
            </Link>
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty>No complaints match.</Empty>
      ) : (
        <div className="mt-4 grid gap-4">
          {rows.map(({ complaint: c, meterNumber, email, name }) => (
            <Card key={c.id} className="gap-3">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{c.subject}</CardTitle>
                  <Badge variant={c.status === "resolved" ? "secondary" : "outline"}>
                    {statusLabel[c.status]}
                  </Badge>
                </div>
                <CardDescription>
                  {categoryLabel[c.category]} · meter {meterNumber} · {name} ({email}) ·{" "}
                  {formatDate(c.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm">
                <p className="whitespace-pre-wrap">{c.description}</p>
                <ComplaintUpdateForm id={c.id} status={c.status} adminNote={c.adminNote} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
