import { http } from "@/shared/api/http";
import type { Period } from "@/shared/types";

export const categorizerApi = {
  /** Aplica as regras por palavra-chave aos lançamentos sem categoria do mês. */
  async applyKeywordRules(period: Period): Promise<{ applied: number; remaining: number }> {
    const { data } = await http.post<{ applied: number; remaining: number }>("/categorizer/apply", period);
    return data;
  },
};
