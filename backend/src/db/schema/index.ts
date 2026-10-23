/**
 * Registro único do schema físico (drizzle-kit + client).
 *
 * O banco é compartilhado, mas cada tabela tem um módulo dono — apenas a
 * infraestrutura do dono escreve nela (regra verificada em .dependency-cruiser.cjs):
 *   users                         → identity
 *   accounts, categories,
 *   transactions,
 *   credit_card_invoices          → ledger
 *   bills, bill_occurrences       → planning
 * O módulo insights (lado de leitura) pode consultar qualquer tabela.
 */
export * from "./users";
export * from "./categories";
export * from "./accounts";
export * from "./bills";
export * from "./transactions";
export * from "./creditCardInvoices";
