import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth";
import { applyRules } from "./categorizer.service";

const router = Router();

const bodySchema = z.object({
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
});

router.post("/apply", requireAuth, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = (req as any).userId as number;
  const { month, year } = parsed.data;
  const result = await applyRules(userId, month, year);
  res.json(result);
});

export default router;
