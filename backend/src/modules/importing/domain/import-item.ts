import type { ImportedTransactionType } from "./bb-statement-policy";

/** Item revisado pelo usuário na tela de importação e enviado para confirmação. */
export interface ImportItem {
  fitid: string;
  date: string;
  amount: number;
  type: ImportedTransactionType;
  description: string;
  categoryId: number | null;
  toAccountId: number | null;
}

export interface PreviewItem extends ImportItem {
  duplicate: boolean;
  suggestedCategoryId: number | null;
}

/** Chave de deduplicação: mesma data, valor e descrição de um lançamento já existente. */
export function duplicateKey(date: string, amount: number, description: string): string {
  return `${date}|${amount.toFixed(2)}|${description.toLowerCase().trim()}`;
}

/** Contas de origem/destino conforme o tipo, a partir da conta do extrato importado. */
export function routeAccounts(
  item: Pick<ImportItem, "type" | "toAccountId">,
  statementAccountId: number | null,
): { fromAccountId: number | null; toAccountId: number | null } {
  switch (item.type) {
    case "transfer":
      return { fromAccountId: statementAccountId, toAccountId: item.toAccountId ?? null };
    case "expense":
      return { fromAccountId: statementAccountId, toAccountId: null };
    case "income":
      return { fromAccountId: null, toAccountId: statementAccountId };
  }
}
