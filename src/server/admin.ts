import "server-only";
import { and, count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  auditLog,
  bills,
  complaints,
  meters,
  payments,
  tariffs,
  user,
  userMeters,
} from "@/db/schema";
import { ROLES } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

/** Escape LIKE wildcards so a search for "100%" doesn't match everything. */
const like = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function adminOverview() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [[customers], [meterCount], [outstanding], [collected], [openComplaints], recent] =
    await Promise.all([
      db.select({ n: count() }).from(user).where(eq(user.role, ROLES.customer)),
      db.select({ n: count() }).from(meters),
      db
        .select({ n: count(), paise: sql<number>`coalesce(sum(${bills.totalPaise}), 0)::int` })
        .from(bills)
        .where(inArray(bills.status, ["unpaid", "overdue"])),
      db
        .select({ paise: sql<number>`coalesce(sum(${payments.amountPaise}), 0)::int` })
        .from(payments)
        .where(and(eq(payments.status, "captured"), gte(payments.capturedAt, monthStart))),
      db.select({ n: count() }).from(complaints).where(eq(complaints.status, "open")),
      db
        .select({
          payment: payments,
          billNumber: bills.billNumber,
          meterNumber: meters.meterNumber,
        })
        .from(payments)
        .innerJoin(bills, eq(payments.billId, bills.id))
        .innerJoin(meters, eq(bills.meterId, meters.id))
        .where(eq(payments.status, "captured"))
        .orderBy(desc(payments.capturedAt))
        .limit(6),
    ]);

  return {
    customers: customers.n,
    meters: meterCount.n,
    outstandingBills: outstanding.n,
    outstandingPaise: outstanding.paise,
    collectedPaise: collected.paise,
    openComplaints: openComplaints.n,
    recent,
  };
}

export async function searchMeters(q: string) {
  const term = q.trim();
  return db
    .select()
    .from(meters)
    .where(
      term
        ? or(
            ilike(meters.meterNumber, like(term)),
            ilike(meters.consumerNumber, like(term)),
            ilike(meters.consumerName, like(term)),
            ilike(meters.district, like(term)),
          )
        : undefined,
    )
    .orderBy(meters.meterNumber)
    .limit(200);
}

export async function getMeterDetail(id: string) {
  if (!isUuid(id)) return null;
  const [meter] = await db.select().from(meters).where(eq(meters.id, id)).limit(1);
  if (!meter) return null;
  const [recentBills, [linked]] = await Promise.all([
    db.select().from(bills).where(eq(bills.meterId, id)).orderBy(desc(bills.periodEnd)).limit(6),
    db.select({ n: count() }).from(userMeters).where(eq(userMeters.meterId, id)),
  ]);
  return { meter, recentBills, linkedUsers: linked.n };
}

export async function listBillsAdmin(status: string | undefined) {
  const valid = ["unpaid", "paid", "overdue", "cancelled"] as const;
  const s = valid.find((v) => v === status);
  return db
    .select({ bill: bills, meterNumber: meters.meterNumber, consumerName: meters.consumerName })
    .from(bills)
    .innerJoin(meters, eq(bills.meterId, meters.id))
    .where(s ? eq(bills.status, s) : undefined)
    .orderBy(desc(bills.periodEnd), meters.meterNumber)
    .limit(100);
}

export async function listPaymentsAdmin() {
  return db
    .select({
      payment: payments,
      billNumber: bills.billNumber,
      meterNumber: meters.meterNumber,
      email: user.email,
    })
    .from(payments)
    .innerJoin(bills, eq(payments.billId, bills.id))
    .innerJoin(meters, eq(bills.meterId, meters.id))
    .leftJoin(user, eq(payments.userId, user.id))
    .orderBy(desc(payments.createdAt))
    .limit(100);
}

export async function listComplaintsAdmin(status: string | undefined) {
  const s = (["open", "in_progress", "resolved"] as const).find((v) => v === status);
  return db
    .select({
      complaint: complaints,
      meterNumber: meters.meterNumber,
      email: user.email,
      name: user.name,
    })
    .from(complaints)
    .innerJoin(meters, eq(complaints.meterId, meters.id))
    .innerJoin(user, eq(complaints.userId, user.id))
    .where(s ? eq(complaints.status, s) : undefined)
    .orderBy(desc(complaints.createdAt))
    .limit(100);
}

export async function listTariffs() {
  return db.select().from(tariffs).orderBy(tariffs.connectionType, desc(tariffs.effectiveFrom));
}

export async function listAudit() {
  return db
    .select({ entry: auditLog, email: user.email })
    .from(auditLog)
    .leftJoin(user, eq(auditLog.actorUserId, user.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(200);
}
