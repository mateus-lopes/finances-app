import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../../shared/infrastructure/http/async-handler";
import { userIdOf, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { parseBody, parseIdParam, periodQuerySchema } from "../../../../shared/infrastructure/http/validation";
import { TRANSACTION_TYPES, type TransactionDraft } from "../../domain/transaction";
import type { ListTransactions } from "../../application/use-cases/transactions/list-transactions";
import type { CreateTransaction } from "../../application/use-cases/transactions/create-transaction";
import type { UpdateTransaction } from "../../application/use-cases/transactions/update-transaction";
import type { DeleteTransaction } from "../../application/use-cases/transactions/delete-transaction";
import type { AutoCategorizeByHistory } from "../../application/use-cases/transactions/auto-categorize-by-history";

const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  fromAccountId: z.number().int().optional().nullable(),
  toAccountId: z.number().int().optional().nullable(),
  amount: z.coerce.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  notes: z.string().optional().nullable(),
  categoryId: z.number().int().optional().nullable(),
}).refine(
  (d) => d.type !== "transfer" || (d.fromAccountId && d.toAccountId),
  { message: "Transfer requer fromAccountId e toAccountId" },
).refine(
  (d) => d.type !== "income" || !!d.toAccountId,
  { message: "Income requer toAccountId" },
).refine(
  (d) => d.type !== "expense" || !!d.fromAccountId,
  { message: "Expense requer fromAccountId" },
);

const listQuerySchema = periodQuerySchema.extend({
  type: z.string().optional(),
  accountId: z.coerce.number().int().optional(),
  categoryId: z.coerce.number().int().optional(),
  uncategorized: z.string().transform((v) => v === "true").optional(),
});

function toDraft(input: z.infer<typeof transactionSchema>): TransactionDraft {
  return {
    type: input.type,
    fromAccountId: input.fromAccountId ?? null,
    toAccountId: input.toAccountId ?? null,
    amount: String(input.amount),
    date: input.date,
    description: input.description,
    notes: input.notes ?? null,
    categoryId: input.categoryId ?? null,
  };
}

export interface TransactionsRouterDeps {
  requireAuth: RequireAuth;
  listTransactions: ListTransactions;
  createTransaction: CreateTransaction;
  updateTransaction: UpdateTransaction;
  deleteTransaction: DeleteTransaction;
  autoCategorizeByHistory: AutoCategorizeByHistory;
}

export function createTransactionsRouter(deps: TransactionsRouterDeps) {
  const router = Router();
  router.use(deps.requireAuth);

  router.get("/", asyncHandler(async (req, res) => {
    const query = listQuerySchema.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    const { month, year, ...filters } = query.data;
    res.json(await deps.listTransactions.execute(userIdOf(req), { month, year }, filters));
  }));

  router.post("/auto-categorize", asyncHandler(async (req, res) => {
    const period = periodQuerySchema.safeParse(req.body);
    if (!period.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    res.json(await deps.autoCategorizeByHistory.execute(userIdOf(req), period.data));
  }));

  router.post("/", asyncHandler(async (req, res) => {
    const body = parseBody(transactionSchema, req.body, res);
    if (!body) return;
    res.status(201).json(await deps.createTransaction.execute(userIdOf(req), toDraft(body)));
  }));

  router.put("/:id", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const body = parseBody(transactionSchema, req.body, res);
    if (!body) return;
    const tx = await deps.updateTransaction.execute(userIdOf(req), id, toDraft(body));
    if (!tx) { res.status(404).json({ error: "Transação não encontrada" }); return; }
    res.json(tx);
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const tx = await deps.deleteTransaction.execute(userIdOf(req), id);
    if (!tx) { res.status(404).json({ error: "Transação não encontrada" }); return; }
    res.json({ ok: true });
  }));

  return router;
}
