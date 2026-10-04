"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/payments", label: "Payments" },
  { href: "/complaints", label: "Complaints" },
  { href: "/profile", label: "Profile" },
];

export function AccountNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(href + "/") ||
    (href === "/dashboard" && pathname.startsWith("/meters"));

  return (
    <nav aria-label="Account" className="border-b bg-card/50">
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
