/**
 * API pública do módulo planning. É o ÚNICO arquivo do planning que outros
 * módulos podem importar (regra em .dependency-cruiser.cjs).
 */
import type { Period } from "../../shared/kernel/period";

export interface PlanningApi {
  /** Garante que as ocorrências da competência existam antes de consultá-las. */
  ensureOccurrences(userId: number, period: Period): Promise<void>;
}
