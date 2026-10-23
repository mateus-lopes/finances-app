import { trailingPeriods, type Period } from "../../../../shared/kernel/period";
import { monthStats, type MonthStats } from "../../domain/month-stats";
import type { InsightsReadModel } from "../ports";

/** Receitas/despesas dos `months` meses terminando em `end`, em ordem cronológica. */
export class GetMonthlyHistory {
  constructor(private readonly readModel: InsightsReadModel) {}

  execute(userId: number, end: Period, months: number): Promise<MonthStats[]> {
    return Promise.all(
      trailingPeriods(end, months).map(async (period) => {
        const { income, expenses } = await this.readModel.monthSums(userId, period);
        return monthStats(period, income, expenses);
      }),
    );
  }
}
