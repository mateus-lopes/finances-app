import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import { getAnalytics, getSpendingAnalytics } from "./analytics.service";

const router = Router();
router.use(requireAuth);

const monthYearSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = monthYearSchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    res.json(await getAnalytics(req.userId!, parsed.data.month, parsed.data.year));
  })
);

router.get(
  "/spending",
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = monthYearSchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    res.json(await getSpendingAnalytics(req.userId!, parsed.data.month, parsed.data.year));
  })
);

export default router;
