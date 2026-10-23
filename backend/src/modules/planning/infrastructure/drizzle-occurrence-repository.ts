import { and, eq } from "drizzle-orm";
import type { Database } from "../../../db/client";
import { billOccurrences } from "../../../db/schema/bills";
import type { Period } from "../../../shared/kernel/period";
import type { BillOccurrence, NewOccurrence } from "../domain/bill";
import type { OccurrenceRepository } from "../application/ports";

export class DrizzleOccurrenceRepository implements OccurrenceRepository {
  constructor(private readonly db: Database) {}

  async listBillIds(userId: number, period: Period): Promise<Set<number>> {
    const rows = await this.db
      .select({ billId: billOccurrences.billId })
      .from(billOccurrences)
      .where(and(
        eq(billOccurrences.userId, userId),
        eq(billOccurrences.month, period.month),
        eq(billOccurrences.year, period.year),
      ));
    return new Set(rows.map((r) => r.billId));
  }

  async insertMany(occurrences: NewOccurrence[]): Promise<void> {
    if (!occurrences.length) return;
    await this.db.insert(billOccurrences).values(occurrences);
  }

  async find(userId: number, id: number): Promise<BillOccurrence | null> {
    const [occurrence] = await this.db
      .select()
      .from(billOccurrences)
      .where(and(eq(billOccurrences.id, id), eq(billOccurrences.userId, userId)));
    return occurrence ?? null;
  }

  async updatePaidState(id: number, state: { paid: boolean; paidAt: Date | null }): Promise<BillOccurrence> {
    const [occurrence] = await this.db
      .update(billOccurrences)
      .set(state)
      .where(eq(billOccurrences.id, id))
      .returning();
    return occurrence;
  }
}
