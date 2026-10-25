import type { Clock } from "../../../../../shared/kernel/clock";
import { periodOfDate } from "../../../../../shared/kernel/period";
import type { Account, AccountData } from "../../../domain/account";
import { initialBalanceDraft } from "../../../domain/initial-balance";
import type { AccountRepository, TransactionRepository } from "../../ports";

export interface CreateAccountInput extends AccountData {
  /** Só é lançado para contas reais (isReal) com valor positivo. */
  initialBalance?: number;
}

export class CreateAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number, input: CreateAccountInput): Promise<Account> {
    const account = await this.accounts.create(userId, input);

    if (input.isReal && input.initialBalance && input.initialBalance > 0) {
      const draft = initialBalanceDraft(account.id, input.initialBalance, periodOfDate(this.clock.now()));
      await this.transactions.create(userId, draft);
    }

    return account;
  }
}
