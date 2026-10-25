import { and, eq, inArray, sum, type SQL } from "drizzle-orm";
import type { Database } from "../../../db/client";
import { accounts, billOccurrences, bills, categories, transactions } from "../../../db/schema";
import { parseAmount } from "../../../shared/kernel/money";
import type { Period } from "../../../shared/kernel/period";
import type { CategoryRef } from "../../../shared/kernel/types";
import type { InsightsReadModel } from "../application/ports";

function transactionsIn(userId: number, period: Period, type: "income" | "expense" | "transfer"): SQL {
  return and(
    eq(transactions.userId, userId),
    eq(transactions.month, period.month),
    eq(transactions.year, period.year),
    eq(transactions.type, type),
  )!;
}

function occurrencesIn(userId: number, period: Period): SQL {
  return and(
    eq(billOccurrences.userId, userId),
    eq(billOccurrences.month, period.month),
    eq(billOccurrences.year, period.year),
  )!;
}

export class DrizzleInsightsReadModel implements InsightsReadModel {
  constructor(private readonly db: Database) {}

  async monthSums(userId: number, period: Period) {
    const [[income], [expenses]] = await Promise.all([
      this.db.select({ total: sum(transactions.amount) }).from(transactions).where(transactionsIn(userId, period, "income")),
      this.db.select({ total: sum(transactions.amount) }).from(transactions).where(transactionsIn(userId, period, "expense")),
    ]);
    return { income: parseAmount(income?.total), expenses: parseAmount(expenses?.total) };
  }

  expenseRows(userId: number, period: Period) {
    return this.db
      .select({ categoryId: transactions.categoryId, amount: transactions.amount })
      .from(transactions)
      .where(transactionsIn(userId, period, "expense"));
  }

  transferRows(userId: number, period: Period) {
    return this.db
      .select({ amount: transactions.amount, toAccountId: transactions.toAccountId })
      .from(transactions)
      .where(transactionsIn(userId, period, "transfer"));
  }

  activeBillOccurrences(userId: number, period: Period) {
    return this.db
      .select({ occ: billOccurrences, bill: bills })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(occurrencesIn(userId, period), eq(bills.active, true)));
  }

  transferBillOccurrences(userId: number, period: Period) {
    return this.db
      .select({ occ: billOccurrences, bill: bills })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .where(and(occurrencesIn(userId, period), eq(bills.type, "transfer")));
  }

  activeInvestmentAccounts(userId: number) {
    return this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.type, "investment"), eq(accounts.active, true)));
  }

  categoriesByIds(userId: number, ids: number[]): Promise<CategoryRef[]> {
    return this.db
      .select({ id: categories.id, name: categories.name, color: categories.color })
      .from(categories)
      .where(and(eq(categories.userId, userId), inArray(categories.id, ids)));
  }

  async expenseTotalsByCategory(userId: number, period: Period) {
    const rows = await this.db
      .select({ categoryId: transactions.categoryId, total: sum(transactions.amount) })
      .from(transactions)
      .where(transactionsIn(userId, period, "expense"))
      .groupBy(transactions.categoryId);
    return rows.map((r) => ({ categoryId: r.categoryId, total: parseAmount(r.total) }));
  }
}
