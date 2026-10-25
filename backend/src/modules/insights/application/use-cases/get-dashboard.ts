import { parseAmount } from "../../../../shared/kernel/money";
import type { Period } from "../../../../shared/kernel/period";
import type { LedgerApi } from "../../../ledger/contracts";
import type { PlanningApi } from "../../../planning/contracts";
import {
  categoryBreakdown,
  investedAmount,
  monthIndicators,
  sumOccurrences,
  toBillReminder,
} from "../../domain/dashboard";
import type { InsightsReadModel } from "../ports";

export type Dashboard = Awaited<ReturnType<GetDashboard["execute"]>>;

export class GetDashboard {
  constructor(
    private readonly readModel: InsightsReadModel,
    private readonly ledger: LedgerApi,
    private readonly planning: PlanningApi,
  ) {}

  async execute(userId: number, period: Period) {
    await this.planning.ensureOccurrences(userId, period);

    const [
      { income: totalIncome, expenses: totalExpenses },
      expenseRows,
      transferRows,
      billOccurrences,
      investments,
      creditCards,
      transferBillOccurrences,
      realBalance,
      accountSummary,
    ] = await Promise.all([
      this.readModel.monthSums(userId, period),
      this.readModel.expenseRows(userId, period),
      this.readModel.transferRows(userId, period),
      this.readModel.activeBillOccurrences(userId, period),
      this.readModel.activeInvestmentAccounts(userId),
      this.ledger.listCreditCardInvoices(userId, period),
      this.readModel.transferBillOccurrences(userId, period),
      this.ledger.getRealBalance(userId),
      this.ledger.getAccountsSummary(userId, period),
    ]);

    const pending = billOccurrences.filter(({ occ }) => !occ.paid);
    const confirmed = billOccurrences.filter(({ occ, bill }) => occ.paid && bill.type !== "transfer");

    const invested = investedAmount(transferRows, new Set(investments.map((i) => i.id)));
    const pendingBillExpense = sumOccurrences(pending, "expense");
    const pendingBillIncome = sumOccurrences(pending, "income");

    const categoryIds = [...new Set([
      ...expenseRows.map((r) => r.categoryId),
      ...pending.map(({ bill }) => bill.categoryId),
      ...confirmed.map(({ bill }) => bill.categoryId),
    ].filter((id): id is number => !!id))];
    const categories = categoryIds.length ? await this.readModel.categoriesByIds(userId, categoryIds) : [];
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const occurrenceByInvestment = new Map(transferBillOccurrences.map((o) => [o.bill.toAccountId, o]));

    return {
      month: period.month,
      year: period.year,
      totalIncome,
      totalExpenses,
      invested,
      ...monthIndicators({ totalIncome, totalExpenses, invested, pendingBillExpense }),
      realBalance,
      accountSummary,
      breakdown: { pendingBillExpense, pendingBillIncome },
      categoriesBreakdown: categoryBreakdown(expenseRows, categoryById),
      creditCards,
      pending: pending.map((o) => toBillReminder(o, categoryById)),
      investments: investments.map((inv) => {
        const planned = occurrenceByInvestment.get(inv.id);
        return {
          id: inv.id,
          name: inv.name,
          type: inv.type,
          currentAmount: parseAmount(inv.currentAmount),
          targetAmount: inv.targetAmount ? parseFloat(inv.targetAmount) : null,
          showProgress: inv.showProgress,
          monthlyAmount: planned ? parseAmount(planned.occ.amount) : null,
          occurrence: planned?.occ ?? null,
          paid: planned?.occ.paid ?? false,
        };
      }),
      confirmed: confirmed.map((o) => toBillReminder(o, categoryById)),
    };
  }
}
