import type { CategoryAssignment, LedgerApi } from "../../../ledger/contracts";
import { categorize, rulesApplyTo } from "../../domain/keyword-rules";

export interface ApplyKeywordRulesInput {
  month?: number;
  year?: number;
}

/** Aplica as regras por palavra-chave aos lançamentos ainda sem categoria. */
export class ApplyKeywordRules {
  constructor(private readonly ledger: LedgerApi) {}

  async execute(userId: number, filter: ApplyKeywordRulesInput): Promise<{ applied: number; remaining: number }> {
    if (!rulesApplyTo(userId)) return { applied: 0, remaining: 0 };

    const [categories, uncategorized] = await Promise.all([
      this.ledger.listCategoryRefs(userId),
      this.ledger.listUncategorizedTransactions(userId, filter),
    ]);
    const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));

    const assignments: CategoryAssignment[] = [];
    for (const tx of uncategorized) {
      const name = categorize(tx.description);
      const categoryId = name ? categoryIdByName.get(name) : undefined;
      if (categoryId) assignments.push({ transactionId: tx.id, categoryId });
    }

    await this.ledger.assignCategories(userId, assignments);
    return { applied: assignments.length, remaining: uncategorized.length - assignments.length };
  }
}
