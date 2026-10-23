import type { Period } from "../../../../shared/kernel/period";
import type { AccountRef, CategoryRef } from "../../../../shared/kernel/types";
import type { LedgerApi } from "../../../ledger/contracts";
import type { Bill, BillOccurrence } from "../../domain/bill";
import { computeBillTotals, type BillTotals } from "../../domain/bill-totals";
import { installmentInfo } from "../../domain/recurrence";
import type { BillRepository } from "../ports";
import type { EnsureOccurrences } from "./ensure-occurrences";

export type BillListItem = Bill & {
  occurrence: BillOccurrence | null;
  fromAccount: AccountRef | null;
  toAccount: AccountRef | null;
  category: CategoryRef | null;
  installmentInfo: { current: number; total: number } | null;
};

export class ListBillsForMonth {
  constructor(
    private readonly bills: BillRepository,
    private readonly ensureOccurrences: EnsureOccurrences,
    private readonly ledger: LedgerApi,
  ) {}

  async execute(userId: number, period: Period): Promise<{ items: BillListItem[]; totals: BillTotals }> {
    await this.ensureOccurrences.execute(userId, period);
    const rows = await this.bills.listActiveWithOccurrence(userId, period);

    const hasAccounts = rows.some(({ bill }) => bill.fromAccountId || bill.toAccountId);
    const hasCategories = rows.some(({ bill }) => bill.categoryId);
    const [accountRefs, categoryRefs] = await Promise.all([
      hasAccounts ? this.ledger.listAccountRefs(userId) : Promise.resolve([]),
      hasCategories ? this.ledger.listCategoryRefs(userId) : Promise.resolve([]),
    ]);
    const accountById = new Map(accountRefs.map((a) => [a.id, a]));
    const categoryById = new Map(categoryRefs.map((c) => [c.id, c]));

    const items = rows.map(({ bill, occurrence }) => ({
      ...bill,
      occurrence,
      fromAccount: bill.fromAccountId ? accountById.get(bill.fromAccountId) ?? null : null,
      toAccount: bill.toAccountId ? accountById.get(bill.toAccountId) ?? null : null,
      category: bill.categoryId ? categoryById.get(bill.categoryId) ?? null : null,
      installmentInfo: installmentInfo(bill.startDate, bill.endDate, period),
    }));

    return { items, totals: computeBillTotals(items) };
  }
}
