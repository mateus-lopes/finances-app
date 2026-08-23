import { pgTable, serial, text, integer, boolean, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const ACCOUNT_TYPES = ["checking", "savings", "cash", "credit_card", "investment"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().$type<AccountType>(),
  color: text("color"),
  active: boolean("active").notNull().default(true),
  targetAmount: numeric("target_amount", { precision: 14, scale: 2 }),
  currentAmount: numeric("current_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  showProgress: boolean("show_progress").notNull().default(false),
  isReal: boolean("is_real").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userActiveIdx: index("accounts_user_active_idx").on(t.userId, t.active),
  userTypeActiveIdx: index("accounts_user_type_active_idx").on(t.userId, t.type, t.active),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
