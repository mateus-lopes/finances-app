import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../../../db/client";
import { creditCardInvoices } from "../../../db/schema/creditCardInvoices";
import type { Period } from "../../../shared/kernel/period";
import type { InvoiceRecord } from "../domain/credit-card-invoice";
import type { InvoiceRepository } from "../application/ports";

type PaidState = { paid: boolean; paidAt: Date | null };

export class DrizzleInvoiceRepository implements InvoiceRepository {
  constructor(private readonly db: Database) {}

  async find(userId: number, accountId: number, period: Period): Promise<InvoiceRecord | null> {
    const [record] = await this.db
      .select()
      .from(creditCardInvoices)
      .where(and(
        eq(creditCardInvoices.accountId, accountId),
        eq(creditCardInvoices.userId, userId),
        eq(creditCardInvoices.month, period.month),
        eq(creditCardInvoices.year, period.year),
      ));
    return record ?? null;
  }

  listForAccounts(userId: number, accountIds: number[], period: Period): Promise<InvoiceRecord[]> {
    return this.db
      .select()
      .from(creditCardInvoices)
      .where(and(
        eq(creditCardInvoices.userId, userId),
        eq(creditCardInvoices.month, period.month),
        eq(creditCardInvoices.year, period.year),
        inArray(creditCardInvoices.accountId, accountIds),
      ));
  }

  async create(userId: number, accountId: number, period: Period, state: PaidState): Promise<InvoiceRecord> {
    const [record] = await this.db
      .insert(creditCardInvoices)
      .values({ accountId, userId, month: period.month, year: period.year, ...state })
      .returning();
    return record;
  }

  async updateState(id: number, state: PaidState): Promise<InvoiceRecord> {
    const [record] = await this.db
      .update(creditCardInvoices)
      .set(state)
      .where(eq(creditCardInvoices.id, id))
      .returning();
    return record;
  }
}
