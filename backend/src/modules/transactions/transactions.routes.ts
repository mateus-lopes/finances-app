import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  transactionSchema,
} from "./transactions.service";

const router = Router();
router.use(requireAuth);

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
  type: z.string().optional(),
  accountId: z.coerce.number().int().optional(),
  categoryId: z.coerce.number().int().optional(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    const { month, year, ...filters } = parsed.data;
    res.json(await listTransactions(req.userId!, month, year, filters));
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const tx = await createTransaction(req.userId!, parsed.data);
    res.status(201).json(tx);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const tx = await updateTransaction(req.userId!, id, parsed.data);
    if (!tx) { res.status(404).json({ error: "Transação não encontrada" }); return; }
    res.json(tx);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const tx = await deleteTransaction(req.userId!, id);
    if (!tx) { res.status(404).json({ error: "Transação não encontrada" }); return; }
    res.json({ ok: true });
  })
);

export default router;
