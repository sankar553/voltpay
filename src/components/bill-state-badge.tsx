import { AlertTriangle, CheckCircle2, Clock, Hourglass, Ban } from "lucide-react";

import { billDisplayState, type BillDisplayState } from "@/lib/dues";
import { cn } from "@/lib/utils";

const config: Record<BillDisplayState, { label: string; Icon: typeof Clock; icon: string }> = {
  paid: { label: "Paid", Icon: CheckCircle2, icon: "text-success" },
  overdue: { label: "Overdue", Icon: AlertTriangle, icon: "text-destructive" },
  due_soon: { label: "Due soon", Icon: Clock, icon: "text-amber-600" },
  upcoming: { label: "Unpaid", Icon: Hourglass, icon: "text-muted-foreground" },
  cancelled: { label: "Cancelled", Icon: Ban, icon: "text-muted-foreground" },
};

/** Status is always icon + text, never colour alone. */
export function BillStateBadge({
  status,
  dueDate,
  todayIso,
  className,
}: {
  status: "unpaid" | "paid" | "overdue" | "cancelled";
  dueDate: string;
  todayIso: string;
  className?: string;
}) {
  const { label, Icon, icon } = config[billDisplayState(status, dueDate, todayIso)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <Icon className={cn("size-3.5", icon)} aria-hidden />
      {label}
    </span>
  );
}
