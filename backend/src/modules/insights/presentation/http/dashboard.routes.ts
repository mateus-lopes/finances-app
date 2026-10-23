import { Router, type Request } from "express";
import { asyncHandler } from "../../../../shared/infrastructure/http/async-handler";
import { userIdOf, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import type { Period } from "../../../../shared/kernel/period";
import type { GetDashboard } from "../../application/use-cases/get-dashboard";
import type { GetMonthlyHistory } from "../../application/use-cases/get-monthly-history";
import type { GetCategoryHistory } from "../../application/use-cases/get-category-history";

const DEFAULT_HISTORY_MONTHS = 6;
const MAX_HISTORY_MONTHS = 24;

/** `endMonth`/`endYear` + `months` (1–24, padrão 6). */
function parseHistoryQuery(req: Request): { end: Period; months: number } | null {
  const month = parseInt(String(req.query.endMonth));
  const year = parseInt(String(req.query.endYear));
  if (isNaN(month) || isNaN(year)) return null;
  const months = Math.min(MAX_HISTORY_MONTHS, Math.max(1, parseInt(String(req.query.months)) || DEFAULT_HISTORY_MONTHS));
  return { end: { month, year }, months };
}

export interface DashboardRouterDeps {
  requireAuth: RequireAuth;
  getDashboard: GetDashboard;
  getMonthlyHistory: GetMonthlyHistory;
  getCategoryHistory: GetCategoryHistory;
}

export function createDashboardRouter(deps: DashboardRouterDeps) {
  const router = Router();
  router.use(deps.requireAuth);

  router.get("/", asyncHandler(async (req, res) => {
    const month = parseInt(String(req.query.month));
    const year = parseInt(String(req.query.year));
    if (isNaN(month) || isNaN(year)) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    res.json(await deps.getDashboard.execute(userIdOf(req), { month, year }));
  }));

  router.get("/history", asyncHandler(async (req, res) => {
    const query = parseHistoryQuery(req);
    if (!query) { res.status(400).json({ error: "endMonth e endYear são obrigatórios" }); return; }
    res.json(await deps.getMonthlyHistory.execute(userIdOf(req), query.end, query.months));
  }));

  router.get("/category-history", asyncHandler(async (req, res) => {
    const query = parseHistoryQuery(req);
    if (!query) { res.status(400).json({ error: "endMonth e endYear são obrigatórios" }); return; }
    res.json(await deps.getCategoryHistory.execute(userIdOf(req), query.end, query.months));
  }));

  return router;
}
