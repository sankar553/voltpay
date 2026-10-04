export type BillDisplayState = "paid" | "overdue" | "due_soon" | "upcoming" | "cancelled";

const DAY = 86_400_000;

const utcDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Today's calendar date in India (bills are due by Indian dates), as YYYY-MM-DD. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** Whole days from `todayIso` to `dueDate` (negative = days overdue). */
export function daysUntil(dueDate: string, todayIso: string): number {
  return Math.round((utcDay(dueDate) - utcDay(todayIso)) / DAY);
}

/** What the customer should see: an unpaid bill past its due date is overdue even before any job marks it. */
export function billDisplayState(
  status: "unpaid" | "paid" | "overdue" | "cancelled",
  dueDate: string,
  todayIso: string,
  soonDays = 5,
): BillDisplayState {
  if (status === "paid" || status === "cancelled") return status;
  const days = daysUntil(dueDate, todayIso);
  if (status === "overdue" || days < 0) return "overdue";
  return days <= soonDays ? "due_soon" : "upcoming";
}
