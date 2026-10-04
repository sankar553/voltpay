import type { Metadata } from "next";
import Link from "next/link";

import { LinkMeterForm } from "@/components/account/link-meter-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/authz";

export const metadata: Metadata = { title: "Link a meter" };

export default async function LinkMeterPage() {
  await requireUser("/meters/link");
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard" className="text-sm text-primary hover:underline">
        ← Dashboard
      </Link>
      <Card className="mt-3">
        <CardHeader>
          <CardTitle className="text-2xl">Link a meter</CardTitle>
          <CardDescription>
            Linked meters show full bill details, history and usage in your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LinkMeterForm />
          <p className="mt-4 text-xs text-muted-foreground">
            Prototype verification. A production service would confirm with an OTP sent to the
            mobile number registered for the meter.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
