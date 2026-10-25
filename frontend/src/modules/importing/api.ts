import { http } from "@/shared/api/http";
import type { TransactionType } from "@/shared/types";

export interface PreviewItem {
  fitid: string;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  duplicate: boolean;
  suggestedCategoryId: number | null;
  categoryId: number | null;
  /** Pré-preenchido com o cartão quando o lançamento é pagamento de fatura. */
  toAccountId: number | null;
}

export interface ConfirmItem {
  fitid: string;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  categoryId: number | null;
  toAccountId?: number | null;
}

export const importApi = {
  async preview(content: string): Promise<{ items: PreviewItem[]; total: number; duplicates: number }> {
    const { data } = await http.post<{ items: PreviewItem[]; total: number; duplicates: number }>("/import/ofx/preview", { content });
    return data;
  },

  async confirm(accountId: number | null, items: ConfirmItem[]): Promise<number> {
    const { data } = await http.post<{ imported: number }>("/import/ofx/confirm", { accountId, items });
    return data.imported;
  },
};
