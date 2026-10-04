import Link from "next/link";

import { cn } from "@/lib/utils";

export function MeterHeader({
  meterId,
  consumerName,
  meterNumber,
  district,
  active,
}: {
  meterId: string;
  consumerName: string;
  meterNumber: string;
  district: string;
  active: "bills" | "usage";
}) {
  const tabs = [
    { key: "bills", label: "Bills", href: `/meters/${meterId}/bills` },
    { key: "usage", label: "Usage", href: `/meters/${meterId}/usage` },
  ] as const;

  return (
    <div className="mb-6">
      <Link href="/dashboard" className="text-sm text-primary hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{consumerName}</h1>
      <p className="text-sm text-muted-foreground">
        Meter {meterNumber} · {district}
      </p>
      <div className="mt-4 inline-flex rounded-lg bg-secondary p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active === t.key ? "page" : undefined}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium",
              active === t.key
                ? "bg-card shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
