import { Gauge, History, QrCode } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/authz";

export const metadata: Metadata = { title: "Dashboard" };

const upcoming = [
  {
    icon: QrCode,
    title: "Scan & pay",
    text: "Scan your meter QR to see and pay the current bill.",
  },
  { icon: Gauge, title: "Your meters", text: "Link meters to your account and track usage." },
  { icon: History, title: "History", text: "Every bill and payment, with downloadable receipts." },
];

export default async function DashboardPage() {
  const { user } = await requireUser("/dashboard");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Hello, {user.name.split(" ")[0]}</h1>
        <Badge variant="secondary">{user.role}</Badge>
      </div>
      <p className="mt-2 text-muted-foreground">Signed in as {user.email}</p>

      <Button asChild size="lg" className="mt-6">
        <Link href="/scan">
          <QrCode aria-hidden /> Scan a meter &amp; pay
        </Link>
      </Button>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {upcoming.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="size-6 text-primary" aria-hidden />
              <CardTitle>{title}</CardTitle>
              <CardDescription>{text}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Coming in Phase 3</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
