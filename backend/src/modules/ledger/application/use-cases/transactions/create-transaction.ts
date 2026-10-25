import type { Transaction, TransactionDraft } from "../../../domain/transaction";
import type { TransactionRepository } from "../../ports";

export class CreateTransaction {
  constructor(private readonly transactions: TransactionRepository) {}

  execute(userId: number, draft: TransactionDraft): Promise<Transaction> {
    return this.transactions.create(userId, draft);
  }
}
