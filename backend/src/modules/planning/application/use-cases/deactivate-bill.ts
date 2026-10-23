import type { Bill } from "../../domain/bill";
import type { BillRepository } from "../ports";

/** Exclusão lógica: ocorrências passadas continuam no histórico. */
export class DeactivateBill {
  constructor(private readonly bills: BillRepository) {}

  execute(userId: number, id: number): Promise<Bill | null> {
    return this.bills.deactivate(userId, id);
  }
}
