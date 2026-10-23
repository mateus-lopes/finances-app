import type { AccountRepository, TransactionRepository } from "../../ports";

/** Saldo real = movimentação histórica completa das contas bancárias reais ativas. */
export class GetRealBalance {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  async execute(userId: number): Promise<number> {
    const realIds = await this.accounts.listActiveRealIds(userId);
    if (!realIds.length) return 0;
    return this.transactions.netFlow(userId, realIds);
  }
}
