import type { Bill, BillData } from "../../domain/bill";
import type { BillRepository } from "../ports";

export class UpdateBill {
  constructor(private readonly bills: BillRepository) {}

  execute(userId: number, id: number, data: BillData): Promise<Bill | null> {
    return this.bills.update(userId, id, data);
  }
}
