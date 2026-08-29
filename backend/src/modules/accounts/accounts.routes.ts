import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import {
  listAccountsWithBalances,
  createAccount,
  updateAccount,
  deleteAccount,
  getInvoice,
  toggleInvoicePaid,
  accountSchema,
} from "./accounts.service";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    res.json(await listAccountsWithBalances(req.userId!, month, year));
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    res.status(201).json(await createAccount(req.userId!, parsed.data));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const account = await updateAccount(req.userId!, id, parsed.data);
    if (!account) { res.status(404).json({ error: "Conta não encontrada" }); return; }
    res.json(account);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const account = await deleteAccount(req.userId!, id);
    if (!account) { res.status(404).json({ error: "Conta não encontrada" }); return; }
    res.json({ ok: true });
  })
);

const invoiceQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

router.get(
  "/:id/invoice",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = invoiceQuerySchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    const invoice = await getInvoice(req.userId!, id, parsed.data.month, parsed.data.year);
    if (!invoice) { res.status(404).json({ error: "Conta não encontrada ou não é cartão" }); return; }
    res.json(invoice);
  })
);

router.patch(
  "/:id/invoice/pay",
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = z.object({
      month: z.coerce.number().int().min(1).max(12),
      year: z.coerce.number().int().min(2000),
    }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    const result = await toggleInvoicePaid(req.userId!, id, parsed.data.month, parsed.data.year);
    res.json(result);
  })
);

export default router;
