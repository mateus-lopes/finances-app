/** Valores monetários trafegam como string `numeric(14,2)` do Postgres. */
export function parseAmount(value: string | null | undefined): number {
  return parseFloat(value ?? "0");
}

export function sumBy<T>(items: readonly T[], amountOf: (item: T) => number): number {
  return items.reduce((acc, item) => acc + amountOf(item), 0);
}
