import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { meters } from "./billing";

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
