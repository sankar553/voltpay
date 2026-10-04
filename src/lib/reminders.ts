import { daysUntil } from "@/lib/dues";

export type ReminderKind = "due_soon" | "overdue";
/** Remind this many days before the due date (inclusive of the due date itself). */
export const REMIND_WITHIN_DAYS = 3;

/**
 * Which reminder (if any) a bill needs today. Each kind is sent at most once per bill and user,
 * so a missed cron run just sends it the next day instead of skipping it.
 */
export function reminderKind(
  status: "unpaid" | "paid" | "overdue" | "cancelled",
  dueDate: string,
  todayIso: string,
): ReminderKind | null {
  if (status === "paid" || status === "cancelled") return null;
  const days = daysUntil(dueDate, todayIso);
  if (days < 0) return "overdue";
  return days <= REMIND_WITHIN_DAYS ? "due_soon" : null;
}

export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
