import { Hono, type Context } from "hono";
import { userIdOf, type AppEnv, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { httpError } from "../../../../shared/infrastructure/http/validation";
import type { Period } from "../../../../shared/kernel/period";
import type { GetDashboard } from "../../application/use-cases/get-dashboard";
import type { GetMonthlyHistory } from "../../application/use-cases/get-monthly-history";
import type { GetCategoryHistory } from "../../application/use-cases/get-category-history";

const DEFAULT_HISTORY_MONTHS = 6;
const MAX_HISTORY_MONTHS = 24;

/** `endMonth`/`endYear` + `months` (1–24, padrão 6). */
function parseHistoryQuery(c: Context): { end: Period; months: number } {
  const month = parseInt(String(c.req.query("endMonth")));
  const year = parseInt(String(c.req.query("endYear")));
  if (isNaN(month) || isNaN(year)) httpError(400, "endMonth e endYear são obrigatórios");
  const months = Math.min(MAX_HISTORY_MONTHS, Math.max(1, parseInt(String(c.req.query("months"))) || DEFAULT_HISTORY_MONTHS));
  return { end: { month, year }, months };
}

export interface DashboardRouterDeps {
  requireAuth: RequireAuth;
  getDashboard: GetDashboard;
  getMonthlyHistory: GetMonthlyHistory;
  getCategoryHistory: GetCategoryHistory;
}

export function createDashboardRouter(deps: DashboardRouterDeps) {
  const router = new Hono<AppEnv>();
  router.use(deps.requireAuth);

  router.get("/", async (c) => {
    const month = parseInt(String(c.req.query("month")));
    const year = parseInt(String(c.req.query("year")));
    if (isNaN(month) || isNaN(year)) httpError(400, "month e year são obrigatórios");
    return c.json(await deps.getDashboard.execute(userIdOf(c), { month, year }));
  });

  router.get("/history", async (c) => {
    const query = parseHistoryQuery(c);
    return c.json(await deps.getMonthlyHistory.execute(userIdOf(c), query.end, query.months));
  });

  router.get("/category-history", async (c) => {
    const query = parseHistoryQuery(c);
    return c.json(await deps.getCategoryHistory.execute(userIdOf(c), query.end, query.months));
  });

  return router;
}
