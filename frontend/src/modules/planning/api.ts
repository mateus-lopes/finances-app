import { http } from "@/shared/api/http";
import type { Period } from "@/shared/types";
import type { Bill, BillInput, BillTotals } from "./types";

export const billsApi = {
  /** Recorrentes ativos com a ocorrência da competência (criada sob demanda pela API). */
  async list(period: Period): Promise<{ items: Bill[]; totals: BillTotals }> {
    const { data } = await http.get<{ items: Bill[]; totals: BillTotals }>("/bills", { params: period });
    return data;
  },

  async create(input: BillInput): Promise<void> {
    await http.post("/bills", input);
  },

  async update(id: number, input: BillInput): Promise<void> {
    await http.put(`/bills/${id}`, input);
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/bills/${id}`);
  },

  /** Marca/desmarca como pago. É só lembrete: não cria transação. */
  async toggleOccurrencePaid(occurrenceId: number): Promise<void> {
    await http.patch(`/bills/occurrences/${occurrenceId}/pay`);
  },
};
