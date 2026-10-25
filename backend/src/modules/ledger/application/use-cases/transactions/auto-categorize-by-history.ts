import type { Period } from "../../../../../shared/kernel/period";
import { inferCategoriesFromHistory } from "../../../domain/history-categorization";
import type { TransactionRepository } from "../../ports";

/** Categoriza lançamentos do mês repetindo a categoria mais usada para a mesma descrição. */
export class AutoCategorizeByHistory {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(userId: number, period: Period): Promise<{ categorized: number; remaining: number }> {
    const [uncategorized, history] = await Promise.all([
      this.transactions.listUncategorized(userId, { ...period, excludeSynthetic: true }),
      this.transactions.listCategorizedHistory(userId),
    ]);
    if (uncategorized.length === 0) return { categorized: 0, remaining: 0 };

    const assignments = inferCategoriesFromHistory(uncategorized, history);
    await this.transactions.assignCategories(userId, assignments);

    return { categorized: assignments.length, remaining: uncategorized.length - assignments.length };
  }
}
