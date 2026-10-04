"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { bills, complaints, meterReadings, meters, tariffs } from "@/db/schema";
import { requireAdmin } from "@/server/authz";
import { audit } from "@/server/audit";
import { billNewReading, runBillingCycle } from "@/server/billing-cycle";
import { generateQrToken } from "@/server/qr";
import { addDays } from "@/lib/dates";
import { isUniqueViolation } from "@/lib/db-errors";
import { todayInIndia } from "@/lib/dues";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });
const firstError = (e: z.ZodError) => e.issues[0].message;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const rupeesToPaise = (v: string) => Math.round(Number(v) * 100);
const rupees = z
  .string()
  .trim()
  .regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter an amount like 50 or 7.50.");

// ─── Meters ──────────────────────────────────────────────────────────────────

const meterFields = {
  consumerName: z.string().trim().min(2, "Enter the consumer name.").max(100),
  address: z.string().trim().min(5, "Enter the service address.").max(200),
  district: z.string().trim().min(2, "Enter the district.").max(60),
  connectionType: z.enum(["domestic", "commercial"]),
  sanctionedLoadKw: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter the load in kW, e.g. 3 or 5.5."),
};

const createMeterSchema = z.object({
  meterNumber: z
    .string()
    .trim()
    .min(3, "Enter the meter number.")
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, "Meter number: letters, digits and dashes only."),
  consumerNumber: z
    .string()
    .trim()
    .min(5, "Enter the consumer number.")
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, "Consumer number: letters, digits and dashes only."),
  openingKwh: z
    .string()
    .trim()
    .regex(/^\d{1,9}$/, "Opening reading must be a whole number of kWh."),
  ...meterFields,
});

export async function createMeterAction(
  input: z.input<typeof createMeterSchema>,
): Promise<Result<{ meterId: string }>> {
  const { user } = await requireAdmin();
  const p = createMeterSchema.safeParse(input);
  if (!p.success) return fail(firstError(p.error));
  const d = p.data;

  try {
    const meter = await db.transaction(async (tx) => {
      const [m] = await tx
        .insert(meters)
        .values({
          meterNumber: d.meterNumber.toUpperCase(),
          consumerNumber: d.consumerNumber.toUpperCase(),
          qrToken: generateQrToken(),
          consumerName: d.consumerName,
          address: d.address,
          district: d.district,
          connectionType: d.connectionType,
          sanctionedLoadKw: d.sanctionedLoadKw,
        })
        .returning();
      await tx.insert(meterReadings).values({
        meterId: m.id,
        readingKwh: Number(d.openingKwh),
        // dated a billing period back so the first reading can be billed straight away
        readAt: addDays(todayInIndia(), -30),
        source: "manual",
      });
      return m;
    });
    await audit({
      actorUserId: user.id,
      action: "meter.created",
      entity: "meter",
      entityId: meter.id,
      meta: { meterNumber: meter.meterNumber },
    });
    revalidatePath("/admin/meters");
    return { ok: true, meterId: meter.id };
  } catch (err) {
    if (isUniqueViolation(err))
      return fail("A meter with that meter number or consumer number already exists.");
    console.error("createMeterAction failed", err);
    return fail("Something went wrong. Please try again.");
  }
}

const updateMeterSchema = z.object({
  id: z.uuid(),
  status: z.enum(["active", "disconnected"]),
  ...meterFields,
});

export async function updateMeterAction(input: z.input<typeof updateMeterSchema>): Promise<Result> {
  const { user } = await requireAdmin();
  const p = updateMeterSchema.safeParse(input);
  if (!p.success) return fail(firstError(p.error));
  const { id, ...values } = p.data;

  const [before] = await db
    .select({ status: meters.status })
    .from(meters)
    .where(eq(meters.id, id))
    .limit(1);
  if (!before) return fail("Meter not found.");
  await db.update(meters).set(values).where(eq(meters.id, id));
  await audit({
    actorUserId: user.id,
    action: before.status !== values.status ? `meter.${values.status}` : "meter.updated",
    entity: "meter",
    entityId: id,
  });
  revalidatePath("/admin/meters");
  revalidatePath(`/admin/meters/${id}`);
  return { ok: true };
}

/** Replace the QR token — the old sticker stops working immediately. */
export async function rotateQrAction(meterId: string): Promise<Result> {
  const { user } = await requireAdmin();
  if (!z.uuid().safeParse(meterId).success) return fail("Meter not found.");
  const res = await db
    .update(meters)
    .set({ qrToken: generateQrToken(), qrTokenRotatedAt: new Date() })
    .where(eq(meters.id, meterId))
    .returning({ id: meters.id });
  if (res.length === 0) return fail("Meter not found.");
  await audit({
    actorUserId: user.id,
    action: "meter.qr_rotated",
    entity: "meter",
    entityId: meterId,
  });
  revalidatePath(`/admin/meters/${meterId}`);
  revalidatePath("/admin/qr");
  return { ok: true };
}

const readingSchema = z.object({
  meterId: z.uuid(),
  readingKwh: z
    .string()
    .trim()
    .regex(/^\d{1,9}$/, "Reading must be a whole number of kWh."),
  readAt: isoDate,
});

/** Enter a meter reading by hand and bill the period. */
export async function addReadingAction(
  input: z.input<typeof readingSchema>,
): Promise<Result<{ message: string }>> {
  const { user } = await requireAdmin();
  const p = readingSchema.safeParse(input);
  if (!p.success) return fail(firstError(p.error));
  if (p.data.readAt > todayInIndia()) return fail("The reading date can't be in the future.");

  const [meter] = await db.select().from(meters).where(eq(meters.id, p.data.meterId)).limit(1);
  if (!meter) return fail("Meter not found.");
  if (meter.status !== "active") return fail("This meter is disconnected.");

  const out = await billNewReading(meter, Number(p.data.readingKwh), p.data.readAt, "manual");
  if (!out.ok) return fail(`Couldn't bill: ${out.reason}.`);
  await audit({
    actorUserId: user.id,
    action: "reading.added",
    entity: "meter",
    entityId: meter.id,
    meta: { bill: out.billNumber, units: out.units },
  });
  revalidatePath(`/admin/meters/${meter.id}`);
  return { ok: true, message: `Created ${out.billNumber}: ${out.units} units.` };
}

// ─── Billing cycle ───────────────────────────────────────────────────────────

export async function runBillingCycleAction(input: {
  readAt: string;
}): Promise<Result<{ created: number; skipped: { meterNumber: string; reason: string }[] }>> {
  const { user } = await requireAdmin();
  const p = z.object({ readAt: isoDate }).safeParse(input);
  if (!p.success) return fail(firstError(p.error));
  if (p.data.readAt > todayInIndia()) return fail("The billing date can't be in the future.");

  const results = await runBillingCycle(p.data.readAt);
  const created = results.filter((r) => r.outcome.ok).length;
  const skipped = results.flatMap((r) =>
    r.outcome.ok ? [] : [{ meterNumber: r.meterNumber, reason: r.outcome.reason }],
  );
  await audit({
    actorUserId: user.id,
    action: "billing.cycle_run",
    entity: "billing",
    meta: { readAt: p.data.readAt, created, skipped: skipped.length },
  });
  revalidatePath("/admin", "layout");
  return { ok: true, created, skipped };
}

// ─── Tariffs ─────────────────────────────────────────────────────────────────

const slabRow = z.object({ upto: z.string().trim(), rate: z.string().trim() });
const tariffSchema = z.object({
  name: z.string().trim().min(3, "Give the tariff a name.").max(60),
  connectionType: z.enum(["domestic", "commercial"]),
  effectiveFrom: isoDate,
  fixedCharge: rupees,
  dutyPercent: z
    .string()
    .trim()
    .regex(/^\d{1,2}(\.\d{1,2})?$/, "Duty is a percentage, e.g. 5."),
  slabs: z.array(slabRow).min(1).max(6),
});

export async function createTariffAction(input: z.input<typeof tariffSchema>): Promise<Result> {
  const { user } = await requireAdmin();
  const p = tariffSchema.safeParse(input);
  if (!p.success) return fail(firstError(p.error));

  // Blank rows are ignored; the last used row is the open-ended slab.
  const rows = p.data.slabs.filter((s) => s.upto !== "" || s.rate !== "");
  if (rows.length === 0) return fail("Add at least one slab.");
  const slabs: { uptoUnits: number | null; paisePerUnit: number }[] = [];
  let lastUpto = 0;
  for (const [i, row] of rows.entries()) {
    if (!/^\d{1,5}(\.\d{1,2})?$/.test(row.rate) || Number(row.rate) <= 0)
      return fail(`Slab ${i + 1}: enter a rate in ₹ per unit.`);
    const isLast = i === rows.length - 1;
    if (isLast) {
      if (row.upto !== "")
        return fail("Leave “Up to” blank on the last slab (it covers all remaining units).");
      slabs.push({ uptoUnits: null, paisePerUnit: rupeesToPaise(row.rate) });
    } else {
      const upto = Number(row.upto);
      if (!/^\d{1,6}$/.test(row.upto) || upto <= lastUpto)
        return fail(`Slab ${i + 1}: “Up to” must be a whole number larger than the previous slab.`);
      lastUpto = upto;
      slabs.push({ uptoUnits: upto, paisePerUnit: rupeesToPaise(row.rate) });
    }
  }

  try {
    const [t] = await db
      .insert(tariffs)
      .values({
        name: p.data.name,
        connectionType: p.data.connectionType,
        effectiveFrom: p.data.effectiveFrom,
        slabs,
        fixedChargePaise: rupeesToPaise(p.data.fixedCharge),
        dutyBps: Math.round(Number(p.data.dutyPercent) * 100),
      })
      .returning();
    await audit({
      actorUserId: user.id,
      action: "tariff.created",
      entity: "tariff",
      entityId: t.id,
      meta: { name: t.name, effectiveFrom: t.effectiveFrom },
    });
    revalidatePath("/admin/tariffs");
    return { ok: true };
  } catch (err) {
    if (isUniqueViolation(err))
      return fail("A tariff for that connection type already starts on that date.");
    console.error("createTariffAction failed", err);
    return fail("Something went wrong. Please try again.");
  }
}

// ─── Bills ───────────────────────────────────────────────────────────────────

/** Only unpaid/overdue bills can be cancelled; paid bills are history. */
export async function cancelBillAction(billId: string): Promise<Result> {
  const { user } = await requireAdmin();
  if (!z.uuid().safeParse(billId).success) return fail("Bill not found.");
  const res = await db
    .update(bills)
    .set({ status: "cancelled" })
    .where(eq(bills.id, billId))
    .returning({ id: bills.id, status: bills.status, number: bills.billNumber });
  if (res.length === 0) return fail("Bill not found.");
  await audit({
    actorUserId: user.id,
    action: "bill.cancelled",
    entity: "bill",
    entityId: billId,
    meta: { billNumber: res[0].number },
  });
  revalidatePath("/admin/bills");
  return { ok: true };
}

// ─── Complaints ──────────────────────────────────────────────────────────────

const complaintUpdateSchema = z.object({
  id: z.uuid(),
  status: z.enum(["open", "in_progress", "resolved"]),
  adminNote: z.string().trim().max(1000, "Keep the response under 1000 characters."),
});

export async function updateComplaintAction(
  input: z.input<typeof complaintUpdateSchema>,
): Promise<Result> {
  const { user } = await requireAdmin();
  const p = complaintUpdateSchema.safeParse(input);
  if (!p.success) return fail(firstError(p.error));
  const res = await db
    .update(complaints)
    .set({
      status: p.data.status,
      adminNote: p.data.adminNote || null,
      resolvedAt: p.data.status === "resolved" ? new Date() : null,
    })
    .where(eq(complaints.id, p.data.id))
    .returning({ id: complaints.id });
  if (res.length === 0) return fail("Complaint not found.");
  await audit({
    actorUserId: user.id,
    action: "complaint.updated",
    entity: "complaint",
    entityId: p.data.id,
    meta: { status: p.data.status },
  });
  revalidatePath("/admin/complaints");
  revalidatePath("/complaints");
  return { ok: true };
}
