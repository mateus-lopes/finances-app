import type { Period } from "../../../../shared/kernel/period";
import { missingOccurrences } from "../../domain/recurrence";
import type { BillRepository, OccurrenceRepository } from "../ports";

/** Materializa (idempotente) as ocorrências da competência para os recorrentes ativos. */
export class EnsureOccurrences {
  constructor(
    private readonly bills: BillRepository,
    private readonly occurrences: OccurrenceRepository,
  ) {}

  async execute(userId: number, period: Period): Promise<void> {
    const activeBills = await this.bills.listActive(userId);
    if (!activeBills.length) return;

    const existing = await this.occurrences.listBillIds(userId, period);
    const toInsert = missingOccurrences(activeBills, existing, userId, period);
    if (toInsert.length) await this.occurrences.insertMany(toInsert);
  }
}
