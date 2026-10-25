import type { Account } from "../../../domain/account";
import type { AccountRepository } from "../../ports";

/** Exclusão lógica: a conta some das listagens mas o histórico é preservado. */
export class DeactivateAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(userId: number, id: number): Promise<Account | null> {
    return this.accounts.deactivate(userId, id);
  }
}
