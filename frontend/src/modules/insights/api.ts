import { http } from "@/shared/api/http";
import type { Period } from "@/shared/types";
import type { AiAnalysisResult, CategoryHistoryData, DashboardData, MonthHistoryPoint } from "./types";

const historyParams = (end: Period, months: number) => ({ endMonth: end.month, endYear: end.year, months });

export const insightsApi = {
  async getDashboard(period: Period): Promise<DashboardData> {
    const { data } = await http.get<DashboardData>("/dashboard", { params: period });
    return data;
  },

  /** `months` competências terminando em `end`, em ordem cronológica. */
  async getMonthlyHistory(end: Period, months: number): Promise<MonthHistoryPoint[]> {
    const { data } = await http.get<MonthHistoryPoint[]>("/dashboard/history", { params: historyParams(end, months) });
    return Array.isArray(data) ? data : [];
  },

  async getCategoryHistory(end: Period, months: number): Promise<CategoryHistoryData> {
    const { data } = await http.get<CategoryHistoryData>("/dashboard/category-history", { params: historyParams(end, months) });
    return data;
  },

  async analyze(period: Period): Promise<AiAnalysisResult> {
    const { data } = await http.post<{ analysis: AiAnalysisResult }>("/ai/analyze", period);
    return data.analysis;
  },
};
