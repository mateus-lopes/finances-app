import type { LedgerApi, TransactionDraft } from "../../../ledger/contracts";
import { routeAccounts, type ImportItem } from "../../domain/import-item";

/** Grava no ledger os itens aprovados, vinculados à conta do extrato. */
export class ConfirmImport {
  constructor(private readonly ledger: LedgerApi) {}

  async execute(userId: number, items: ImportItem[], statementAccountId: number | null): Promise<number> {
    if (!items.length) return 0;

    const drafts: TransactionDraft[] = items.map((item) => ({
      type: item.type,
      ...routeAccounts(item, statementAccountId),
      amount: item.amount.toFixed(2),
      date: item.date,
      description: item.description,
      categoryId: item.categoryId,
    }));

    return this.ledger.recordTransactions(userId, drafts);
  }
}
