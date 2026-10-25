import type { Period } from "../../../../../shared/kernel/period";
import type { AccountRef, CategoryRef } from "../../../../../shared/kernel/types";
import { computeTotals, type TransactionTotals } from "../../../domain/transaction";
import type {
  AccountRepository,
  CategoryRepository,
  TransactionFilters,
  TransactionListRow,
  TransactionRepository,
} from "../../ports";

export type TransactionListItem = TransactionListRow & {
  fromAccount: AccountRef | null;
  toAccount: AccountRef | null;
  category: CategoryRef | null;
};

export interface TransactionList {
  items: TransactionListItem[];
  totals: TransactionTotals;
}

export class ListTransactions {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(userId: number, period: Period, filters?: TransactionFilters): Promise<TransactionList> {
    const rows = await this.transactions.listVisible(userId, period, filters);

    const hasAccounts = rows.some((r) => r.fromAccountId || r.toAccountId);
    const hasCategories = rows.some((r) => r.categoryId);
    const [accountRefs, categoryRefs] = await Promise.all([
      hasAccounts ? this.accounts.listRefs(userId) : Promise.resolve([]),
      hasCategories ? this.categories.listRefs(userId) : Promise.resolve([]),
    ]);

    const accountById = new Map(accountRefs.map((a) => [a.id, a]));
    const categoryById = new Map(categoryRefs.map((c) => [c.id, c]));

    const items = rows.map((r) => ({
      ...r,
      fromAccount: r.fromAccountId ? accountById.get(r.fromAccountId) ?? null : null,
      toAccount: r.toAccountId ? accountById.get(r.toAccountId) ?? null : null,
      category: r.categoryId ? categoryById.get(r.categoryId) ?? null : null,
    }));

    const totals = computeTotals(items, (id) => accountById.get(id)?.type === "investment");
    return { items, totals };
  }
}
