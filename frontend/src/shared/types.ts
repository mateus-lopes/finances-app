/** Competência mensal usada em quase todas as consultas. */
export interface Period {
  month: number;
  year: number;
}

export type TransactionType = "income" | "expense" | "transfer";

export interface AccountRef {
  id: number;
  name: string;
  type?: string;
  color: string | null;
}

export interface CategoryRef {
  id: number;
  name: string;
  color: string | null;
}
