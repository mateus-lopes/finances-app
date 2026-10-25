import type { Account, AccountData } from "../../../domain/account";
import type { AccountRepository } from "../../ports";

export class UpdateAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(userId: number, id: number, data: AccountData): Promise<Account | null> {
    return this.accounts.update(userId, id, data);
  }
}
