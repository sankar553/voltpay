import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { user } from "@/db/schema";
import { ROLES } from "@/lib/auth";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();

  const [[customers], [admins]] = await Promise.all([
    db.select({ n: count() }).from(user).where(eq(user.role, ROLES.customer)),
    db.select({ n: count() }).from(user).where(eq(user.role, ROLES.admin)),
  ]);

  const stats = [
    { label: "Customers", value: customers.n },
    { label: "Admins", value: admins.n },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Admin console</h1>
      <p className="mt-2 text-muted-foreground">
        Meters, billing, payments and complaints arrive in Phase 4.
      </p>
      <p className="mt-4">
        <Link href="/admin/qr" className="font-medium text-primary hover:underline">
          View meter QR codes →
        </Link>
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
