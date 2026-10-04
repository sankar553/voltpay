import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/money";
import { listUserComplaints } from "@/server/account";
import { requireUser } from "@/server/authz";

export const metadata: Metadata = { title: "Complaints" };

const categoryLabel = {
  billing: "Billing",
  meter_fault: "Meter fault",
  supply: "Power supply",
  other: "Other",
} as const;
const statusLabel = { open: "Open", in_progress: "In progress", resolved: "Resolved" } as const;

export default async function ComplaintsPage() {
  const { user } = await requireUser("/complaints");
  const rows = await listUserComplaints(user.id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Complaints</h1>
          <p className="mt-1 text-muted-foreground">
            Billing, meter or supply problems — track their status here.
          </p>
        </div>
        <Button asChild>
          <Link href="/complaints/new">
            <Plus aria-hidden /> New complaint
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-muted-foreground">You haven’t raised any complaints.</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {rows.map(({ complaint: c, meterNumber }) => (
            <Card key={c.id} className="gap-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{c.subject}</CardTitle>
                  <Badge variant={c.status === "resolved" ? "secondary" : "outline"}>
                    {statusLabel[c.status]}
                  </Badge>
                </div>
                <CardDescription>
                  {categoryLabel[c.category]} · meter {meterNumber} · {formatDate(c.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="whitespace-pre-wrap">{c.description}</p>
                {c.adminNote && (
                  <p className="mt-3 rounded-md bg-secondary px-3 py-2 text-muted-foreground">
                    <strong className="text-foreground">Response:</strong> {c.adminNote}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
