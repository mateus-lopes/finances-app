import type { Bill, BillData } from "../../domain/bill";
import type { BillRepository } from "../ports";

export class CreateBill {
  constructor(private readonly bills: BillRepository) {}

  execute(userId: number, data: BillData): Promise<Bill> {
    return this.bills.create(userId, data);
  }
}
