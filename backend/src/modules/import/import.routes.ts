import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import { previewOFX, confirmOFX } from "./import.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/ofx/preview",
  asyncHandler(async (req: AuthRequest, res) => {
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    const items = await previewOFX(req.userId!, content);
    res.json({
      items,
      total: items.length,
      duplicates: items.filter(i => i.duplicate).length,
    });
  })
);

const confirmSchema = z.object({
  accountId: z.number().int().nullable(),
  items: z.array(
    z.object({
      fitid: z.string(),
      date: z.string(),
      amount: z.number(),
      type: z.enum(["income", "expense", "transfer"]),
      description: z.string(),
      categoryId: z.number().int().nullable().optional(),
      toAccountId: z.number().int().nullable().optional(),
    })
  ),
});

router.post(
  "/ofx/confirm",
  asyncHandler(async (req: AuthRequest, res) => {
    const { items, accountId } = confirmSchema.parse(req.body);
    const imported = await confirmOFX(req.userId!, items, accountId);
    res.json({ imported });
  })
);

export default router;
