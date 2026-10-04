import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { bills, meters } from "./billing";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const complaintCategory = pgEnum("complaint_category", [
  "billing",
  "meter_fault",
  "supply",
  "other",
]);
export const complaintStatus = pgEnum("complaint_status", ["open", "in_progress", "resolved"]);

/** Customer service requests about a meter (handled by admins in Phase 4). */
export const complaints = pgTable(
  "complaints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    meterId: uuid("meter_id")
      .notNull()
      .references(() => meters.id, { onDelete: "cascade" }),
    category: complaintCategory("category").notNull(),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: complaintStatus("status").default("open").notNull(),
    adminNote: text("admin_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("complaints_user_idx").on(t.userId), index("complaints_status_idx").on(t.status)],
);

/** Extra account details and notification preferences (name/email live in Better Auth's user). */
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  phone: text("phone"),
  address: text("address"),
  /** Used by the Phase 5 due-date reminder emails. */
  notifyEmail: boolean("notify_email").default(true).notNull(),
  ...timestamps,
});

/** One row per reminder email sent, so each bill gets at most one "due soon" and one "overdue" email per user. */
export const reminderLog = pgTable(
  "reminder_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: uuid("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "due_soon" | "overdue"
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reminder_log_once_idx").on(t.billId, t.userId, t.kind)],
);

/** Messages from the public contact form (soft-deleted by admins, never hard-deleted from the app). */
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    ip: text("ip"),
    readAt: timestamp("read_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("contact_messages_created_idx").on(t.createdAt),
    index("contact_messages_ip_idx").on(t.ip, t.createdAt),
  ],
);
