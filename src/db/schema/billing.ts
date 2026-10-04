/**
 * Billing domain: meters, ownership links, tariffs, readings, bills, payments.
 * All money is stored as integer paise (₹1 = 100 paise) to avoid float errors.
 */
import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const connectionType = pgEnum("connection_type", ["domestic", "commercial"]);
export const meterStatus = pgEnum("meter_status", ["active", "disconnected"]);
export const meterRelation = pgEnum("meter_relation", ["owner", "family", "tenant"]);
export const readingSource = pgEnum("reading_source", ["simulated", "manual", "smart"]);
export const billStatus = pgEnum("bill_status", ["unpaid", "paid", "overdue", "cancelled"]);
export const paymentStatus = pgEnum("payment_status", [
  "created",
  "authorized",
  "captured",
  "failed",
  "refunded",
]);

// ─── Meters ──────────────────────────────────────────────────────────────────

export const meters = pgTable(
  "meters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meterNumber: text("meter_number").notNull().unique(),
    consumerNumber: text("consumer_number").notNull().unique(),
    /** Random, non-guessable token printed (signed) in the QR. Rotatable. */
    qrToken: text("qr_token").notNull().unique(),
    qrTokenRotatedAt: timestamp("qr_token_rotated_at", { withTimezone: true }),
    consumerName: text("consumer_name").notNull(),
    address: text("address").notNull(),
    district: text("district").notNull(),
    connectionType: connectionType("connection_type").default("domestic").notNull(),
    sanctionedLoadKw: numeric("sanctioned_load_kw", { precision: 6, scale: 2 })
      .default("3")
      .notNull(),
    status: meterStatus("status").default("active").notNull(),
    ...timestamps,
  },
  (t) => [index("meters_district_idx").on(t.district)],
);

/** Which users can see/manage which meters (a meter can be shared by a family). */
export const userMeters = pgTable(
  "user_meters",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    meterId: uuid("meter_id")
      .notNull()
      .references(() => meters.id, { onDelete: "cascade" }),
    relation: meterRelation("relation").default("owner").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.meterId] }),
    index("user_meters_meter_idx").on(t.meterId),
  ],
);

// ─── Tariffs ─────────────────────────────────────────────────────────────────

export type TariffSlab = {
  /** Upper bound (inclusive) of this slab in units; null = no upper bound. */
  uptoUnits: number | null;
  paisePerUnit: number;
};

export const tariffs = pgTable(
  "tariffs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    connectionType: connectionType("connection_type").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    slabs: jsonb("slabs").$type<TariffSlab[]>().notNull(),
    fixedChargePaise: integer("fixed_charge_paise").notNull(),
    /** Electricity duty in basis points of energy charges (500 = 5%). */
    dutyBps: integer("duty_bps").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("tariffs_type_effective_idx").on(t.connectionType, t.effectiveFrom)],
);

// ─── Readings & bills ────────────────────────────────────────────────────────

export const meterReadings = pgTable(
  "meter_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meterId: uuid("meter_id")
      .notNull()
      .references(() => meters.id, { onDelete: "cascade" }),
    readingKwh: integer("reading_kwh").notNull(),
    readAt: date("read_at", { mode: "string" }).notNull(),
    source: readingSource("source").default("simulated").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("meter_readings_meter_date_idx").on(t.meterId, t.readAt),
    check("meter_readings_non_negative", sql`${t.readingKwh} >= 0`),
  ],
);

export const bills = pgTable(
  "bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billNumber: text("bill_number").notNull().unique(),
    meterId: uuid("meter_id")
      .notNull()
      .references(() => meters.id, { onDelete: "restrict" }),
    tariffId: uuid("tariff_id")
      .notNull()
      .references(() => tariffs.id, { onDelete: "restrict" }),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    previousReadingId: uuid("previous_reading_id")
      .notNull()
      .references(() => meterReadings.id, { onDelete: "restrict" }),
    currentReadingId: uuid("current_reading_id")
      .notNull()
      .references(() => meterReadings.id, { onDelete: "restrict" }),
    units: integer("units").notNull(),
    energyPaise: integer("energy_paise").notNull(),
    fixedPaise: integer("fixed_paise").notNull(),
    dutyPaise: integer("duty_paise").notNull(),
    adjustmentPaise: integer("adjustment_paise").default(0).notNull(),
    totalPaise: integer("total_paise").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    status: billStatus("status").default("unpaid").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("bills_meter_status_idx").on(t.meterId, t.status),
    uniqueIndex("bills_meter_period_idx").on(t.meterId, t.periodEnd),
    check("bills_units_non_negative", sql`${t.units} >= 0`),
    check("bills_total_non_negative", sql`${t.totalPaise} >= 0`),
  ],
);

// ─── Payments ────────────────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: uuid("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "restrict" }),
    /** Null when a guest pays (allowed, like BBPS). */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    amountPaise: integer("amount_paise").notNull(),
    currency: text("currency").default("INR").notNull(),
    gateway: text("gateway").notNull(), // "razorpay" | "mock"
    gatewayOrderId: text("gateway_order_id").notNull().unique(),
    gatewayPaymentId: text("gateway_payment_id").unique(),
    method: text("method"),
    status: paymentStatus("status").default("created").notNull(),
    failureReason: text("failure_reason"),
    receiptNumber: text("receipt_number").unique(),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("payments_bill_idx").on(t.billId),
    index("payments_user_idx").on(t.userId),
    // A bill can be successfully paid only once.
    uniqueIndex("payments_one_captured_per_bill")
      .on(t.billId)
      .where(sql`${t.status} = 'captured'`),
  ],
);

/** Every gateway webhook we've processed — the unique event id makes handling idempotent. */
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull().unique(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const metersRelations = relations(meters, ({ many }) => ({
  users: many(userMeters),
  readings: many(meterReadings),
  bills: many(bills),
}));

export const userMetersRelations = relations(userMeters, ({ one }) => ({
  user: one(user, { fields: [userMeters.userId], references: [user.id] }),
  meter: one(meters, { fields: [userMeters.meterId], references: [meters.id] }),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  meter: one(meters, { fields: [bills.meterId], references: [meters.id] }),
  tariff: one(tariffs, { fields: [bills.tariffId], references: [tariffs.id] }),
  previousReading: one(meterReadings, {
    fields: [bills.previousReadingId],
    references: [meterReadings.id],
    relationName: "previous_reading",
  }),
  currentReading: one(meterReadings, {
    fields: [bills.currentReadingId],
    references: [meterReadings.id],
    relationName: "current_reading",
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  bill: one(bills, { fields: [payments.billId], references: [bills.id] }),
  user: one(user, { fields: [payments.userId], references: [user.id] }),
}));

export const meterReadingsRelations = relations(meterReadings, ({ one }) => ({
  meter: one(meters, { fields: [meterReadings.meterId], references: [meters.id] }),
}));
