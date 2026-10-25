import { and, eq } from "drizzle-orm";
import type { Database } from "../../../db/client";
import { billOccurrences, bills } from "../../../db/schema/bills";
import type { Period } from "../../../shared/kernel/period";
import type { Bill, BillData } from "../domain/bill";
import type { BillRepository } from "../application/ports";

export class DrizzleBillRepository implements BillRepository {
  constructor(private readonly db: Database) {}

  listActive(userId: number): Promise<Bill[]> {
    return this.db.select().from(bills).where(and(eq(bills.userId, userId), eq(bills.active, true)));
  }

  listActiveWithOccurrence(userId: number, period: Period) {
    return this.db
      .select({ bill: bills, occurrence: billOccurrences })
      .from(bills)
      .leftJoin(
        billOccurrences,
        and(
          eq(billOccurrences.billId, bills.id),
          eq(billOccurrences.month, period.month),
          eq(billOccurrences.year, period.year),
        ),
      )
      .where(and(eq(bills.userId, userId), eq(bills.active, true)))
      .orderBy(bills.createdAt);
  }

  async create(userId: number, data: BillData): Promise<Bill> {
    const [bill] = await this.db.insert(bills).values({ userId, ...data }).returning();
    return bill;
  }

  async update(userId: number, id: number, data: BillData): Promise<Bill | null> {
    const [bill] = await this.db
      .update(bills)
      .set(data)
      .where(and(eq(bills.id, id), eq(bills.userId, userId)))
      .returning();
    return bill ?? null;
  }

  async deactivate(userId: number, id: number): Promise<Bill | null> {
    const [bill] = await this.db
      .update(bills)
      .set({ active: false })
      .where(and(eq(bills.id, id), eq(bills.userId, userId)))
      .returning();
    return bill ?? null;
  }
}
