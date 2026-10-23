import { trailingPeriods, type Period } from "../../../../shared/kernel/period";
import type { InsightsReadModel } from "../ports";

export interface CategorySeries {
  categoryId: number;
  name: string;
  color: string | null;
  /** Total de despesas por mês, alinhado com `months`. */
  data: number[];
}

/** Série mensal de despesas por categoria, ordenada da categoria com maior gasto total. */
export class GetCategoryHistory {
  constructor(private readonly readModel: InsightsReadModel) {}

  async execute(userId: number, end: Period, months: number): Promise<{ months: Period[]; series: CategorySeries[] }> {
    const periods = trailingPeriods(end, months);
    const monthlyTotals = await Promise.all(
      periods.map((period) => this.readModel.expenseTotalsByCategory(userId, period)),
    );

    const categoryIds = [...new Set(
      monthlyTotals.flatMap((rows) => rows.map((r) => r.categoryId)).filter((id): id is number => id != null),
    )];
    const categories = categoryIds.length ? await this.readModel.categoriesByIds(userId, categoryIds) : [];
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const series = categoryIds.map((categoryId) => ({
      categoryId,
      name: categoryById.get(categoryId)?.name ?? "Sem categoria",
      color: categoryById.get(categoryId)?.color ?? null,
      data: monthlyTotals.map((rows) => rows.find((r) => r.categoryId === categoryId)?.total ?? 0),
    }));

    const totalOf = (s: CategorySeries) => s.data.reduce((acc, v) => acc + v, 0);
    series.sort((a, b) => totalOf(b) - totalOf(a));

    return { months: periods.map(({ month, year }) => ({ month, year })), series };
  }
}
