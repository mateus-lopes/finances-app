import type { Transaction } from "../../../domain/transaction";
import type { TransactionRepository } from "../../ports";

export class DeleteTransaction {
  constructor(private readonly transactions: TransactionRepository) {}

  execute(userId: number, id: number): Promise<Transaction | null> {
    return this.transactions.delete(userId, id);
  }
}
