import { pgTable, serial, text, integer, boolean, numeric, date, timestamp, unique, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { accounts } from "./accounts";
import { categories } from "./categories";
import type { BillFrequency, BillType } from "../../modules/planning/domain/bill";

export { BILL_TYPES, BILL_FREQUENCIES, type BillType, type BillFrequency } from "../../modules/planning/domain/bill";

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().$type<BillType>(),
  fromAccountId: integer("from_account_id").references(() => accounts.id, { onDelete: "set null" }),
  toAccountId: integer("to_account_id").references(() => accounts.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  frequency: text("frequency").notNull().$type<BillFrequency>().default("monthly"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const billOccurrences = pgTable("bill_occurrences", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dueDate: date("due_date").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  transactionId: integer("transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.billId, t.month, t.year),
  userMonthYearIdx: index("bill_occ_user_month_year_idx").on(t.userId, t.month, t.year),
  billIdIdx: index("bill_occ_bill_id_idx").on(t.billId),
}));

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
export type BillOccurrence = typeof billOccurrences.$inferSelect;
export type NewBillOccurrence = typeof billOccurrences.$inferInsert;
