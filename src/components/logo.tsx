import { Zap } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Zap className="size-4 fill-accent text-accent" aria-hidden />
      </span>
      <span className="text-lg">
        Volt<span className="text-primary">Pay</span>
      </span>
    </Link>
  );
}
