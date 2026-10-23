import { and, desc, eq, inArray, isNotNull, isNull, or, sum, type SQL } from "drizzle-orm";
import type { Database } from "../../../db/client";
import { transactions } from "../../../db/schema/transactions";
import { parseAmount } from "../../../shared/kernel/money";
import { periodOfIsoDate, type Period } from "../../../shared/kernel/period";
import type { AccountFlows } from "../domain/account-balances";
import type { CategoryAssignment } from "../domain/history-categorization";
import type { Transaction, TransactionDraft, TransactionType } from "../domain/transaction";
import type { TransactionFingerprint } from "../contracts";
import type {
  TransactionFilters,
  TransactionListRow,
  TransactionRepository,
  UncategorizedFilter,
} from "../application/ports";

function toRow(userId: number, draft: TransactionDraft) {
  const { month, year } = periodOfIsoDate(draft.date);
  return {
    userId,
    type: draft.type,
    fromAccountId: draft.fromAccountId,
    toAccountId: draft.toAccountId,
    amount: draft.amount,
    date: draft.date,
    month,
    year,
    description: draft.description,
    notes: draft.notes ?? null,
    categoryId: draft.categoryId,
    isInitialBalance: draft.isInitialBalance ?? false,
  };
}

function inPeriod(userId: number, period: Period): SQL {
  return and(
    eq(transactions.userId, userId),
    eq(transactions.month, period.month),
    eq(transactions.year, period.year),
  )!;
}

const toTotalsMap = (rows: Array<{ accountId: number | null; total: string | null }>) =>
  new Map(rows.map((r) => [r.accountId as number, parseAmount(r.total)]));

export class DrizzleTransactionRepository implements TransactionRepository {
  constructor(private readonly db: Database) {}

  listVisible(userId: number, period: Period, filters: TransactionFilters = {}): Promise<TransactionListRow[]> {
    return this.db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
        month: transactions.month,
        year: transactions.year,
        description: transactions.description,
        notes: transactions.notes,
        reconciled: transactions.reconciled,
        isCarryOver: transactions.isCarryOver,
        billId: transactions.billId,
        createdAt: transactions.createdAt,
        fromAccountId: transactions.fromAccountId,
        toAccountId: transactions.toAccountId,
        categoryId: transactions.categoryId,
      })
      .from(transactions)
      .where(
        and(
          inPeriod(userId, period),
          eq(transactions.isCarryOver, false),
          eq(transactions.isInitialBalance, false),
          filters.type ? eq(transactions.type, filters.type as TransactionType) : undefined,
          filters.categoryId ? eq(transactions.categoryId, filters.categoryId) : undefined,
          filters.uncategorized ? isNull(transactions.categoryId) : undefined,
          filters.accountId
            ? or(eq(transactions.fromAccountId, filters.accountId), eq(transactions.toAccountId, filters.accountId))
            : undefined,
        ),
      )
      .orderBy(desc(transactions.date), desc(transactions.createdAt));
  }

  async create(userId: number, draft: TransactionDraft): Promise<Transaction> {
    const [tx] = await this.db.insert(transactions).values(toRow(userId, draft)).returning();
    return tx;
  }

  async createMany(userId: number, drafts: TransactionDraft[]): Promise<number> {
    if (!drafts.length) return 0;
    await this.db.insert(transactions).values(drafts.map((d) => toRow(userId, d)));
    return drafts.length;
  }

  async update(userId: number, id: number, draft: TransactionDraft): Promise<Transaction | null> {
    const { isInitialBalance: _ignored, userId: _owner, ...changes } = toRow(userId, draft);
    const [tx] = await this.db
      .update(transactions)
      .set(changes)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return tx ?? null;
  }

  async delete(userId: number, id: number): Promise<Transaction | null> {
    const [tx] = await this.db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return tx ?? null;
  }

  async flowsByAccount(userId: number, accountIds: number[], period?: Period): Promise<AccountFlows> {
    const scope = period ? inPeriod(userId, period) : eq(transactions.userId, userId);
    const [inflows, outflows] = await Promise.all([
      this.db
        .select({ accountId: transactions.toAccountId, total: sum(transactions.amount) })
        .from(transactions)
        .where(and(scope, inArray(transactions.toAccountId, accountIds)))
        .groupBy(transactions.toAccountId),
      this.db
        .select({ accountId: transactions.fromAccountId, total: sum(transactions.amount) })
        .from(transactions)
        .where(and(scope, inArray(transactions.fromAccountId, accountIds)))
        .groupBy(transactions.fromAccountId),
    ]);
    return { inflows: toTotalsMap(inflows), outflows: toTotalsMap(outflows) };
  }

  async expensesByAccount(userId: number, accountIds: number[], period: Period): Promise<Map<number, number>> {
    const rows = await this.db
      .select({ accountId: transactions.fromAccountId, total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        inPeriod(userId, period),
        eq(transactions.type, "expense"),
        inArray(transactions.fromAccountId, accountIds),
      ))
      .groupBy(transactions.fromAccountId);
    return toTotalsMap(rows);
  }

  async netFlow(userId: number, accountIds: number[]): Promise<number> {
    const [[inflow], [outflow]] = await Promise.all([
      this.db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), inArray(transactions.toAccountId, accountIds))),
      this.db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), inArray(transactions.fromAccountId, accountIds))),
    ]);
    return parseAmount(inflow?.total) - parseAmount(outflow?.total);
  }

  listUncategorized(userId: number, filter: UncategorizedFilter) {
    return this.db
      .select({ id: transactions.id, description: transactions.description })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        isNull(transactions.categoryId),
        filter.month !== undefined ? eq(transactions.month, filter.month) : undefined,
        filter.year !== undefined ? eq(transactions.year, filter.year) : undefined,
        filter.excludeSynthetic ? eq(transactions.isCarryOver, false) : undefined,
        filter.excludeSynthetic ? eq(transactions.isInitialBalance, false) : undefined,
      ));
  }

  listCategorizedHistory(userId: number) {
    return this.db
      .select({ description: transactions.description, categoryId: transactions.categoryId })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNotNull(transactions.categoryId)));
  }

  async assignCategories(userId: number, assignments: CategoryAssignment[]): Promise<void> {
    await Promise.all(
      assignments.map((a) =>
        this.db
          .update(transactions)
          .set({ categoryId: a.categoryId })
          .where(and(eq(transactions.id, a.transactionId), eq(transactions.userId, userId))),
      ),
    );
  }

  listFingerprints(userId: number): Promise<TransactionFingerprint[]> {
    return this.db
      .select({ date: transactions.date, amount: transactions.amount, description: transactions.description })
      .from(transactions)
      .where(eq(transactions.userId, userId));
  }
}
