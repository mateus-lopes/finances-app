import { pgTable, serial, text, integer, boolean, numeric, date, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { bills } from "./bills";

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<TransactionType>(),
  fromAccountId: integer("from_account_id").references(() => accounts.id, { onDelete: "set null" }),
  toAccountId: integer("to_account_id").references(() => accounts.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  date: date("date").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  description: text("description").notNull(),
  notes: text("notes"),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  billId: integer("bill_id").references(() => bills.id, { onDelete: "set null" }),
  reconciled: boolean("reconciled").notNull().default(false),
  isCarryOver: boolean("is_carry_over").notNull().default(false),
  isInitialBalance: boolean("is_initial_balance").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userMonthYearIdx: index("tx_user_month_year_idx").on(t.userId, t.month, t.year),
  userMonthYearTypeIdx: index("tx_user_month_year_type_idx").on(t.userId, t.month, t.year, t.type),
  fromAccountIdx: index("tx_from_account_idx").on(t.fromAccountId),
  toAccountIdx: index("tx_to_account_idx").on(t.toAccountId),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
