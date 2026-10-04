import type { Metadata } from "next";
import Link from "next/link";

import { ComplaintForm } from "@/components/account/complaint-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/authz";
import { listUserMeters } from "@/server/meters";

export const metadata: Metadata = { title: "New complaint" };

export default async function NewComplaintPage() {
  const { user } = await requireUser("/complaints/new");
  const meters = await listUserMeters(user.id);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/complaints" className="text-sm text-primary hover:underline">
        ← Complaints
      </Link>
      <Card className="mt-3">
        <CardHeader>
          <CardTitle className="text-2xl">New complaint</CardTitle>
          <CardDescription>Tell us what’s wrong and which meter it’s about.</CardDescription>
        </CardHeader>
        <CardContent>
          {meters.length === 0 ? (
            <div className="grid gap-3 text-sm">
              <p>You need to link a meter before raising a complaint.</p>
              <Button asChild className="justify-self-start">
                <Link href="/meters/link">Link a meter</Link>
              </Button>
            </div>
          ) : (
            <ComplaintForm
              meters={meters.map(({ meter }) => ({
                id: meter.id,
                label: `${meter.meterNumber} — ${meter.consumerName}`,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
