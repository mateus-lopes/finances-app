import type { Transaction, TransactionDraft } from "../../../domain/transaction";
import type { TransactionRepository } from "../../ports";

export class UpdateTransaction {
  constructor(private readonly transactions: TransactionRepository) {}

  execute(userId: number, id: number, draft: TransactionDraft): Promise<Transaction | null> {
    return this.transactions.update(userId, id, draft);
  }
}
