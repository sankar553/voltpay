import type { Metadata } from "next";
import Link from "next/link";

import { MeterForm } from "@/components/admin/admin-forms";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Add meter" };

export default async function NewMeterPage() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/meters" className="text-sm text-primary hover:underline">
        ← Meters
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Add meter</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        A QR code is generated automatically. Use fictional details in the demo.
      </p>
      <div className="max-w-2xl rounded-xl border bg-card p-6">
        <MeterForm />
      </div>
    </>
  );
}
