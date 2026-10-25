import type { StatementEntry } from "../domain/statement-entry";

/** Converte o arquivo de extrato bruto (OFX hoje) em lançamentos. */
export interface StatementReader {
  read(content: string): StatementEntry[];
}
