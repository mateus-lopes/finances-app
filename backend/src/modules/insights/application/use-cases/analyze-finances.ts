import type { Period } from "../../../../shared/kernel/period";
import type { FinancialAnalysis } from "../../domain/financial-analysis";
import type { FinancialAdvisor } from "../ports";
import type { GetDashboard } from "./get-dashboard";
import type { GetMonthlyHistory } from "./get-monthly-history";

const HISTORY_MONTHS = 6;

/** Monta o retrato financeiro do mês e pede a análise ao consultor (IA). */
export class AnalyzeFinances {
  constructor(
    private readonly getDashboard: GetDashboard,
    private readonly getMonthlyHistory: GetMonthlyHistory,
    private readonly advisor: FinancialAdvisor,
  ) {}

  async execute(userId: number, period: Period): Promise<FinancialAnalysis> {
    const [dashboard, history] = await Promise.all([
      this.getDashboard.execute(userId, period),
      this.getMonthlyHistory.execute(userId, period, HISTORY_MONTHS),
    ]);

    return this.advisor.analyze({
      period,
      totalIncome: dashboard.totalIncome,
      totalExpenses: dashboard.totalExpenses,
      saldo: dashboard.saldo,
      invested: dashboard.invested,
      savingsRate: dashboard.savingsRate,
      commitmentPct: dashboard.commitmentPct,
      freeToSpend: dashboard.freeToSpend,
      categories: dashboard.categoriesBreakdown
        .filter((c) => c.categoryName && c.total > 0)
        .map((c) => ({ name: c.categoryName!, total: c.total }))
        .sort((a, b) => b.total - a.total),
      history,
    });
  }
}
