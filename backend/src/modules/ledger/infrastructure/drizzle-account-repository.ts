import { and, eq } from "drizzle-orm";
import type { Database } from "../../../db/client";
import { accounts } from "../../../db/schema/accounts";
import type { AccountRef } from "../../../shared/kernel/types";
import type { Account, AccountData } from "../domain/account";
import type { AccountRepository } from "../application/ports";

export class DrizzleAccountRepository implements AccountRepository {
  constructor(private readonly db: Database) {}

  listActive(userId: number): Promise<Account[]> {
    return this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.active, true)))
      .orderBy(accounts.createdAt);
  }

  listActiveCreditCards(userId: number): Promise<Account[]> {
    return this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.type, "credit_card"), eq(accounts.active, true)))
      .orderBy(accounts.createdAt);
  }

  async findActive(userId: number, id: number): Promise<Account | null> {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId), eq(accounts.active, true)));
    return account ?? null;
  }

  async listActiveRealIds(userId: number): Promise<number[]> {
    const rows = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isReal, true), eq(accounts.active, true)));
    return rows.map((r) => r.id);
  }

  listRefs(userId: number): Promise<AccountRef[]> {
    return this.db
      .select({ id: accounts.id, name: accounts.name, type: accounts.type, color: accounts.color })
      .from(accounts)
      .where(eq(accounts.userId, userId));
  }

  async create(userId: number, data: AccountData): Promise<Account> {
    const [account] = await this.db
      .insert(accounts)
      .values({
        userId,
        name: data.name,
        type: data.type,
        color: data.color,
        targetAmount: data.targetAmount ? String(data.targetAmount) : null,
        showProgress: data.showProgress ?? false,
        isReal: data.isReal ?? false,
      })
      .returning();
    return account;
  }

  async update(userId: number, id: number, data: AccountData): Promise<Account | null> {
    const [account] = await this.db
      .update(accounts)
      .set({
        name: data.name,
        type: data.type,
        color: data.color,
        targetAmount: data.targetAmount ? String(data.targetAmount) : null,
        currentAmount: data.currentAmount !== undefined ? data.currentAmount.toFixed(2) : undefined,
        showProgress: data.showProgress ?? false,
        isReal: data.isReal ?? false,
      })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return account ?? null;
  }

  async deactivate(userId: number, id: number): Promise<Account | null> {
    const [account] = await this.db
      .update(accounts)
      .set({ active: false })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return account ?? null;
  }
}
