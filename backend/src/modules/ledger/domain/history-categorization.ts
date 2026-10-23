/** Normaliza descrições para comparar lançamentos recorrentes (remove sufixo após `*`). */
export function normalizeDescription(description: string): string {
  return description.replace(/\*.*$/, "").replace(/\s+/g, " ").trim().toUpperCase();
}

export interface CategoryAssignment {
  transactionId: number;
  categoryId: number;
}

/**
 * Sugere a categoria mais frequente já usada para a mesma descrição
 * normalizada. Lançamentos sem histórico ficam de fora.
 */
export function inferCategoriesFromHistory(
  uncategorized: ReadonlyArray<{ id: number; description: string }>,
  history: ReadonlyArray<{ description: string; categoryId: number | null }>,
): CategoryAssignment[] {
  const frequency = new Map<string, Map<number, number>>();
  for (const h of history) {
    if (!h.categoryId) continue;
    const key = normalizeDescription(h.description);
    const counts = frequency.get(key) ?? new Map<number, number>();
    counts.set(h.categoryId, (counts.get(h.categoryId) ?? 0) + 1);
    frequency.set(key, counts);
  }

  const assignments: CategoryAssignment[] = [];
  for (const tx of uncategorized) {
    const counts = frequency.get(normalizeDescription(tx.description));
    if (!counts) continue;
    let best = -1;
    let bestCount = 0;
    for (const [categoryId, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        best = categoryId;
      }
    }
    if (best > 0) assignments.push({ transactionId: tx.id, categoryId: best });
  }
  return assignments;
}
