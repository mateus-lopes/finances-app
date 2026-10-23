import type { Period } from "../../../shared/kernel/period";
import type { Bill, BillData, BillOccurrence, NewOccurrence } from "../domain/bill";

export interface BillRepository {
  listActive(userId: number): Promise<Bill[]>;
  /** Recorrentes ativos com a ocorrência da competência (se existir), por data de criação. */
  listActiveWithOccurrence(userId: number, period: Period): Promise<Array<{ bill: Bill; occurrence: BillOccurrence | null }>>;
  create(userId: number, data: BillData): Promise<Bill>;
  update(userId: number, id: number, data: BillData): Promise<Bill | null>;
  deactivate(userId: number, id: number): Promise<Bill | null>;
}

export interface OccurrenceRepository {
  listBillIds(userId: number, period: Period): Promise<Set<number>>;
  insertMany(occurrences: NewOccurrence[]): Promise<void>;
  find(userId: number, id: number): Promise<BillOccurrence | null>;
  updatePaidState(id: number, state: { paid: boolean; paidAt: Date | null }): Promise<BillOccurrence>;
}
