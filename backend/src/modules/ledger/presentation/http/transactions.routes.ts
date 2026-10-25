import { Hono } from "hono";
import { z } from "zod";
import { userIdOf, type AppEnv, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { httpError, parseBody, parseIdParam, periodQuerySchema, readJson } from "../../../../shared/infrastructure/http/validation";
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
  const router = new Hono<AppEnv>();
  router.use(deps.requireAuth);

  router.get("/", async (c) => {
    const query = listQuerySchema.safeParse(c.req.query());
    if (!query.success) httpError(400, "month e year são obrigatórios");
    const { month, year, ...filters } = query.data;
    return c.json(await deps.listTransactions.execute(userIdOf(c), { month, year }, filters));
  });

  router.post("/auto-categorize", async (c) => {
    const period = periodQuerySchema.safeParse(await readJson(c));
    if (!period.success) httpError(400, "month e year são obrigatórios");
    return c.json(await deps.autoCategorizeByHistory.execute(userIdOf(c), period.data));
  });

  router.post("/", async (c) => {
    const body = await parseBody(c, transactionSchema);
    return c.json(await deps.createTransaction.execute(userIdOf(c), toDraft(body)), 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    const body = await parseBody(c, transactionSchema);
    const tx = await deps.updateTransaction.execute(userIdOf(c), id, toDraft(body));
    if (!tx) return c.json({ error: "Transação não encontrada" }, 404);
    return c.json(tx);
  });

  router.delete("/:id", async (c) => {
    const id = parseIdParam(c);
    const tx = await deps.deleteTransaction.execute(userIdOf(c), id);
    if (!tx) return c.json({ error: "Transação não encontrada" }, 404);
    return c.json({ ok: true });
  });

  return router;
}
