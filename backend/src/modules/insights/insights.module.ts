import type { Hono } from "hono";
import type { Database } from "../../db/client";
import type { AppEnv, RequireAuth } from "../../shared/infrastructure/http/auth-context";
import type { LedgerApi } from "../ledger/contracts";
import type { PlanningApi } from "../planning/contracts";
import { GetDashboard } from "./application/use-cases/get-dashboard";
import { GetMonthlyHistory } from "./application/use-cases/get-monthly-history";
import { GetCategoryHistory } from "./application/use-cases/get-category-history";
import { AnalyzeFinances } from "./application/use-cases/analyze-finances";
import { DrizzleInsightsReadModel } from "./infrastructure/drizzle-insights-read-model";
import { GeminiFinancialAdvisor } from "./infrastructure/gemini-financial-advisor";
import { createDashboardRouter } from "./presentation/http/dashboard.routes";
import { createAiRouter } from "./presentation/http/ai.routes";

export interface InsightsModuleDeps {
  db: Database;
  requireAuth: RequireAuth;
  ledger: LedgerApi;
  planning: PlanningApi;
  geminiApiKey: string;
}

export interface InsightsModule {
  dashboardRouter: Hono<AppEnv>;
  aiRouter: Hono<AppEnv>;
}

export function createInsightsModule({ db, requireAuth, ledger, planning, geminiApiKey }: InsightsModuleDeps): InsightsModule {
  const readModel = new DrizzleInsightsReadModel(db);
  const getDashboard = new GetDashboard(readModel, ledger, planning);
  const getMonthlyHistory = new GetMonthlyHistory(readModel);

  return {
    dashboardRouter: createDashboardRouter({
      requireAuth,
      getDashboard,
      getMonthlyHistory,
      getCategoryHistory: new GetCategoryHistory(readModel),
    }),
    aiRouter: createAiRouter({
      requireAuth,
      analyzeFinances: new AnalyzeFinances(getDashboard, getMonthlyHistory, new GeminiFinancialAdvisor(geminiApiKey)),
    }),
  };
}
