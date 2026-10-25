import { Hono } from "hono";
import { z } from "zod";
import { userIdOf, type AppEnv, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { httpError, parseBody, parseIdParam, periodQuerySchema } from "../../../../shared/infrastructure/http/validation";
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
  const router = new Hono<AppEnv>();
  router.use(deps.requireAuth);

  router.get("/", async (c) => {
    const period = periodQuerySchema.safeParse(c.req.query());
    if (!period.success) httpError(400, "month e year são obrigatórios");
    return c.json(await deps.listBillsForMonth.execute(userIdOf(c), period.data));
  });

  router.post("/", async (c) => {
    const body = await parseBody(c, billSchema);
    return c.json(await deps.createBill.execute(userIdOf(c), toBillData(body)), 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    const body = await parseBody(c, billSchema);
    const bill = await deps.updateBill.execute(userIdOf(c), id, toBillData(body));
    if (!bill) return c.json({ error: "Recorrente não encontrado" }, 404);
    return c.json(bill);
  });

  router.delete("/:id", async (c) => {
    const id = parseIdParam(c);
    const bill = await deps.deactivateBill.execute(userIdOf(c), id);
    if (!bill) return c.json({ error: "Recorrente não encontrado" }, 404);
    return c.json({ ok: true });
  });

  router.get("/occurrences", async (c) => {
    const period = periodQuerySchema.safeParse(c.req.query());
    if (!period.success) httpError(400, "month e year são obrigatórios");
    await deps.ensureOccurrences.execute(userIdOf(c), period.data);
    return c.json({ ok: true });
  });

  router.patch("/occurrences/:id/pay", async (c) => {
    const id = parseIdParam(c);
    const occurrence = await deps.toggleOccurrencePaid.execute(userIdOf(c), id);
    if (!occurrence) return c.json({ error: "Ocorrência não encontrada" }, 404);
    return c.json(occurrence);
  });

  return router;
}
