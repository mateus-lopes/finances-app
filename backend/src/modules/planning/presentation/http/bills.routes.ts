import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../../shared/infrastructure/http/async-handler";
import { userIdOf, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { parseBody, parseIdParam, periodQuerySchema } from "../../../../shared/infrastructure/http/validation";
import { BILL_FREQUENCIES, BILL_TYPES, type BillData } from "../../domain/bill";
import type { ListBillsForMonth } from "../../application/use-cases/list-bills-for-month";
import type { CreateBill } from "../../application/use-cases/create-bill";
import type { UpdateBill } from "../../application/use-cases/update-bill";
import type { DeactivateBill } from "../../application/use-cases/deactivate-bill";
import type { EnsureOccurrences } from "../../application/use-cases/ensure-occurrences";
import type { ToggleOccurrencePaid } from "../../application/use-cases/toggle-occurrence-paid";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const billSchema = z.object({
  name: z.string().min(1).max(150),
  type: z.enum(BILL_TYPES),
  fromAccountId: z.number().int().optional().nullable(),
  toAccountId: z.number().int().optional().nullable(),
  amount: z.coerce.number().positive(),
  categoryId: z.number().int().optional().nullable(),
  frequency: z.enum(BILL_FREQUENCIES).default("monthly"),
  startDate: isoDate,
  endDate: isoDate.optional().nullable(),
  notes: z.string().optional().nullable(),
});

function toBillData(input: z.infer<typeof billSchema>): BillData {
  return {
    name: input.name,
    type: input.type,
    fromAccountId: input.fromAccountId ?? null,
    toAccountId: input.toAccountId ?? null,
    amount: String(input.amount),
    categoryId: input.categoryId ?? null,
    frequency: input.frequency,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    notes: input.notes ?? null,
  };
}

export interface BillsRouterDeps {
  requireAuth: RequireAuth;
  listBillsForMonth: ListBillsForMonth;
  createBill: CreateBill;
  updateBill: UpdateBill;
  deactivateBill: DeactivateBill;
  ensureOccurrences: EnsureOccurrences;
  toggleOccurrencePaid: ToggleOccurrencePaid;
}

export function createBillsRouter(deps: BillsRouterDeps) {
  const router = Router();
  router.use(deps.requireAuth);

  router.get("/", asyncHandler(async (req, res) => {
    const period = periodQuerySchema.safeParse(req.query);
    if (!period.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    res.json(await deps.listBillsForMonth.execute(userIdOf(req), period.data));
  }));

  router.post("/", asyncHandler(async (req, res) => {
    const body = parseBody(billSchema, req.body, res);
    if (!body) return;
    res.status(201).json(await deps.createBill.execute(userIdOf(req), toBillData(body)));
  }));

  router.put("/:id", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const body = parseBody(billSchema, req.body, res);
    if (!body) return;
    const bill = await deps.updateBill.execute(userIdOf(req), id, toBillData(body));
    if (!bill) { res.status(404).json({ error: "Recorrente não encontrado" }); return; }
    res.json(bill);
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const bill = await deps.deactivateBill.execute(userIdOf(req), id);
    if (!bill) { res.status(404).json({ error: "Recorrente não encontrado" }); return; }
    res.json({ ok: true });
  }));

  router.get("/occurrences", asyncHandler(async (req, res) => {
    const period = periodQuerySchema.safeParse(req.query);
    if (!period.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    await deps.ensureOccurrences.execute(userIdOf(req), period.data);
    res.json({ ok: true });
  }));

  router.patch("/occurrences/:id/pay", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const occurrence = await deps.toggleOccurrencePaid.execute(userIdOf(req), id);
    if (!occurrence) { res.status(404).json({ error: "Ocorrência não encontrada" }); return; }
    res.json(occurrence);
  }));

  return router;
}
