import { parseAmount } from "../../../../shared/kernel/money";
import type { LedgerApi } from "../../../ledger/contracts";
import { classifyEntry, isCreditCardPayment, type ClassifiedEntry } from "../../domain/bb-statement-policy";
import { suggestCategoryName } from "../../domain/category-suggestion";
import { duplicateKey, type PreviewItem } from "../../domain/import-item";
import type { StatementReader } from "../ports";

/**
 * Lê o extrato e devolve os itens para revisão: tipo classificado,
 * categoria sugerida, cartão de destino para pagamentos de fatura e
 * marcação de duplicados. Nada é gravado aqui.
 */
export class PreviewImport {
  constructor(
    private readonly reader: StatementReader,
    private readonly ledger: LedgerApi,
  ) {}

  async execute(userId: number, content: string): Promise<PreviewItem[]> {
    const entries = this.reader
      .read(content)
      .map(classifyEntry)
      .filter((e): e is ClassifiedEntry => e !== null);
    if (!entries.length) return [];

    const [existing, categories, creditCardId] = await Promise.all([
      this.ledger.listTransactionFingerprints(userId),
      this.ledger.listCategoryRefs(userId),
      this.ledger.findPrimaryCreditCardId(userId),
    ]);

    const existingKeys = new Set(
      existing.map((t) => duplicateKey(t.date, parseAmount(t.amount), t.description ?? "")),
    );
    const categoryIdByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

    return entries.map((entry) => {
      const suggestedName = suggestCategoryName(entry.description);
      const suggested = suggestedName ? categoryIdByName.get(suggestedName.toLowerCase()) ?? null : null;
      return {
        ...entry,
        toAccountId: isCreditCardPayment(entry.description) ? creditCardId : null,
        categoryId: suggested,
        suggestedCategoryId: suggested,
        duplicate: existingKeys.has(duplicateKey(entry.date, entry.amount, entry.description)),
      };
    });
  }
}
