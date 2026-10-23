import type { Clock } from "../../../../../shared/kernel/clock";
import type { Period } from "../../../../../shared/kernel/period";
import { togglePaidState, type InvoiceRecord } from "../../../domain/credit-card-invoice";
import type { InvoiceRepository } from "../../ports";

export class ToggleInvoicePaid {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number, accountId: number, period: Period): Promise<InvoiceRecord> {
    const record = await this.invoices.find(userId, accountId, period);
    const state = togglePaidState(record, this.clock.now());
    return record
      ? this.invoices.updateState(record.id, state)
      : this.invoices.create(userId, accountId, period, state);
  }
}
