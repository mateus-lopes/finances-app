import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import { getDashboard, getDashboardHistory } from "./dashboard.service";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req: AuthRequest, res) => {
  const month = parseInt(String(req.query.month));
  const year = parseInt(String(req.query.year));
  if (isNaN(month) || isNaN(year)) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
  res.json(await getDashboard(req.userId!, month, year));
}));

router.get("/history", asyncHandler(async (req: AuthRequest, res) => {
  const endMonth = parseInt(String(req.query.endMonth));
  const endYear  = parseInt(String(req.query.endYear));
  const months   = Math.min(24, Math.max(1, parseInt(String(req.query.months)) || 6));
  if (isNaN(endMonth) || isNaN(endYear)) { res.status(400).json({ error: "endMonth e endYear são obrigatórios" }); return; }
  res.json(await getDashboardHistory(req.userId!, endMonth, endYear, months));
}));

export default router;
