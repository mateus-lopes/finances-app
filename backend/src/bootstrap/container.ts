import type { Hono } from "hono";
import { createDatabase } from "../db/client";
import { isProduction, type AppConfig } from "../shared/infrastructure/config/env";
import type { AppEnv } from "../shared/infrastructure/http/auth-context";
import type { RateLimiter } from "../shared/infrastructure/http/rate-limiter";
import { systemClock } from "../shared/kernel/clock";
import { createIdentityModule } from "../modules/identity/identity.module";
import { createLedgerModule } from "../modules/ledger/ledger.module";
import { createPlanningModule } from "../modules/planning/planning.module";
import { createCategorizerModule } from "../modules/categorizer/categorizer.module";
import { createImportingModule } from "../modules/importing/importing.module";
import { createInsightsModule } from "../modules/insights/insights.module";

/** Rota da API (prefixo sob /api) → router do módulo responsável. */
export type ApiRoutes = ReadonlyArray<readonly [path: string, router: Hono<AppEnv>]>;

export interface ContainerDeps {
  config: AppConfig;
  /** Varia por runtime: binding do Cloudflare em produção, memória no Node. */
  loginRateLimiter: RateLimiter;
}

/**
 * Composition root: o único lugar que conhece todas as implementações
 * concretas. Ordem = grafo de dependências entre módulos:
 *   identity → ledger → planning → categorizer / importing → insights
 */
export function createContainer({ config, loginRateLimiter }: ContainerDeps): { routes: ApiRoutes } {
  const db = createDatabase(config.DATABASE_URL);
  const clock = systemClock;

  const identity = createIdentityModule({
    db,
    jwtSecret: config.JWT_SECRET,
    adminResetPassword: config.ADMIN_RESET_PASSWORD,
    loginRateLimiter,
    isProduction: isProduction(config),
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
    geminiApiKey: config.GEMINI_API_KEY,
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
