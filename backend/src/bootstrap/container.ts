import type { Router } from "express";
import { db } from "../db/client";
import { env, isProduction } from "../shared/infrastructure/config/env";
import { systemClock } from "../shared/kernel/clock";
import { createIdentityModule } from "../modules/identity/identity.module";
import { createLedgerModule } from "../modules/ledger/ledger.module";
import { createPlanningModule } from "../modules/planning/planning.module";
import { createCategorizerModule } from "../modules/categorizer/categorizer.module";
import { createImportingModule } from "../modules/importing/importing.module";
import { createInsightsModule } from "../modules/insights/insights.module";

/** Rota da API (prefixo sob /api) → router do módulo responsável. */
export type ApiRoutes = ReadonlyArray<readonly [path: string, router: Router]>;

/**
 * Composition root: o único lugar que conhece todas as implementações
 * concretas. Ordem = grafo de dependências entre módulos:
 *   identity → ledger → planning → categorizer / importing → insights
 */
export function createContainer(): { routes: ApiRoutes } {
  const clock = systemClock;

  const identity = createIdentityModule({
    db,
    jwtSecret: env.JWT_SECRET,
    adminResetPassword: env.ADMIN_RESET_PASSWORD,
    isProduction,
  });
  const { requireAuth } = identity;

  const ledger = createLedgerModule({ db, clock, requireAuth });
  const planning = createPlanningModule({ db, clock, requireAuth, ledger: ledger.api });
  const categorizer = createCategorizerModule({ requireAuth, ledger: ledger.api });
  const importing = createImportingModule({ requireAuth, ledger: ledger.api });
  const insights = createInsightsModule({
    db,
    requireAuth,
    ledger: ledger.api,
    planning: planning.api,
    geminiApiKey: env.GEMINI_API_KEY,
  });

  return {
    routes: [
      ["/auth", identity.router],
      ["/categories", ledger.categoriesRouter],
      ["/accounts", ledger.accountsRouter],
      ["/transactions", ledger.transactionsRouter],
      ["/bills", planning.billsRouter],
      ["/dashboard", insights.dashboardRouter],
      ["/ai", insights.aiRouter],
      ["/import", importing.router],
      ["/categorizer", categorizer.router],
    ],
  };
}
