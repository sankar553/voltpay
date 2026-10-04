import "server-only";
import { and, eq, inArray, lt, lte } from "drizzle-orm";

import { db } from "@/db";
import { bills, meters, profiles, reminderLog, user, userMeters } from "@/db/schema";
import { addDays } from "@/lib/dates";
import { daysUntil, todayInIndia } from "@/lib/dues";
import { env } from "@/lib/env";
import { formatDate, formatINR } from "@/lib/money";
import { escapeHtml, reminderKind, REMIND_WITHIN_DAYS, type ReminderKind } from "@/lib/reminders";
import { sendEmail } from "@/server/email";

export type DailyJobSummary = {
  markedOverdue: number;
  sent: number;
  /** printed to the server console (development, no email key) */
  logged: number;
  /** not sent because no email provider is configured in production */
  skipped: number;
  failed: number;
};

function buildEmail(input: {
  name: string;
  meterNumber: string;
  billNumber: string;
  totalPaise: number;
  dueDate: string;
  kind: ReminderKind;
  days: number;
}) {
  const amount = formatINR(input.totalPaise);
  const due = formatDate(input.dueDate);
  const url = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/dashboard`;
  const when =
    input.kind === "overdue"
      ? `was due on ${due} and is now overdue`
      : input.days === 0
        ? `is due today (${due})`
        : `is due in ${input.days} day${input.days === 1 ? "" : "s"} (${due})`;
  const subject =
    input.kind === "overdue"
      ? `Overdue: electricity bill ${input.billNumber}`
      : `Reminder: electricity bill ${input.billNumber} due ${due}`;
  const text = `Hi ${input.name},\n\nYour bill ${input.billNumber} for meter ${input.meterNumber} (${amount}) ${when}.\n\nPay it in a minute: ${url}\n\n— VoltPay (prototype, test mode)`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#161a2b">
<h2 style="margin:0 0 8px">VoltPay</h2>
<p>Hi ${escapeHtml(input.name)},</p>
<p>Your bill <strong>${escapeHtml(input.billNumber)}</strong> for meter <strong>${escapeHtml(input.meterNumber)}</strong> (<strong>${escapeHtml(amount)}</strong>) ${escapeHtml(when)}.</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#1d4fd7;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View &amp; pay</a></p>
<p style="color:#5a6078;font-size:12px">VoltPay prototype · payments in test mode. You can turn reminders off on your profile page.</p></div>`;
  return { subject, text, html };
}

/**
 * Daily housekeeping: flip unpaid bills past their due date to "overdue", then email reminders
 * (3 days before / on the due date, and once when overdue) to every linked account that has
 * reminders on. Safe to run any number of times a day.
 */
export async function runDailyJob(now: Date = new Date()): Promise<DailyJobSummary> {
  const today = todayInIndia(now);
  const summary: DailyJobSummary = { markedOverdue: 0, sent: 0, logged: 0, skipped: 0, failed: 0 };

  const marked = await db
    .update(bills)
    .set({ status: "overdue" })
    .where(and(eq(bills.status, "unpaid"), lt(bills.dueDate, today)))
    .returning({ id: bills.id });
  summary.markedOverdue = marked.length;

  const rows = await db
    .select({
      billId: bills.id,
      billNumber: bills.billNumber,
      status: bills.status,
      dueDate: bills.dueDate,
      totalPaise: bills.totalPaise,
      meterNumber: meters.meterNumber,
      userId: user.id,
      name: user.name,
      email: user.email,
      notifyEmail: profiles.notifyEmail,
    })
    .from(bills)
    .innerJoin(meters, eq(bills.meterId, meters.id))
    .innerJoin(userMeters, eq(userMeters.meterId, meters.id))
    .innerJoin(user, eq(userMeters.userId, user.id))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(
      and(
        inArray(bills.status, ["unpaid", "overdue"]),
        lte(bills.dueDate, addDays(today, REMIND_WITHIN_DAYS)),
      ),
    );

  for (const r of rows) {
    if (r.notifyEmail === false) continue;
    const kind = reminderKind(r.status, r.dueDate, today);
    if (!kind) continue;

    // Claim first (unique index), then send: two overlapping runs can't double-send.
    const claimed = await db
      .insert(reminderLog)
      .values({ billId: r.billId, userId: r.userId, kind })
      .onConflictDoNothing()
      .returning({ id: reminderLog.id });
    if (claimed.length === 0) continue;

    const mail = buildEmail({ ...r, kind, days: daysUntil(r.dueDate, today) });
    const res = await sendEmail({ to: r.email, ...mail });

    if (res.status === "sent") summary.sent++;
    else if (res.status === "logged") summary.logged++;
    else {
      // Nothing was delivered: release the claim so a later run retries.
      await db.delete(reminderLog).where(eq(reminderLog.id, claimed[0].id));
      if (res.status === "skipped") summary.skipped++;
      else summary.failed++;
    }
  }
  return summary;
}
