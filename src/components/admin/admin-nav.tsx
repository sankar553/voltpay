"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/meters", label: "Meters" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/bills", label: "Bills" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/tariffs", label: "Tariffs" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/inbox", label: "Inbox" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href ||
        pathname.startsWith(href + "/") ||
        (href === "/admin/meters" && pathname.startsWith("/admin/qr"));

  return (
    <nav aria-label="Admin" className="border-b bg-card/50">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors",
              isActive(l.href)
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
