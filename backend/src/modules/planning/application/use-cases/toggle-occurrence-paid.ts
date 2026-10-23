import type { Clock } from "../../../../shared/kernel/clock";
import { togglePaid, type BillOccurrence } from "../../domain/bill";
import type { OccurrenceRepository } from "../ports";

/** Marca/desmarca a ocorrência como paga. Não cria transação (o OFX é a fonte de verdade). */
export class ToggleOccurrencePaid {
  constructor(
    private readonly occurrences: OccurrenceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number, occurrenceId: number): Promise<BillOccurrence | null> {
    const occurrence = await this.occurrences.find(userId, occurrenceId);
    if (!occurrence) return null;
    return this.occurrences.updatePaidState(occurrence.id, togglePaid(occurrence, this.clock.now()));
  }
}
