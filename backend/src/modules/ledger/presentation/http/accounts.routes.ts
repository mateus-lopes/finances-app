import { Hono } from "hono";
import { z } from "zod";
import { userIdOf, type AppEnv, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { httpError, parseBody, parseIdParam, periodQuerySchema, readJson } from "../../../../shared/infrastructure/http/validation";
import { ACCOUNT_TYPES } from "../../domain/account";
import type { GetAccountBalances } from "../../application/use-cases/accounts/get-account-balances";
import type { CreateAccount } from "../../application/use-cases/accounts/create-account";
import type { UpdateAccount } from "../../application/use-cases/accounts/update-account";
import type { DeactivateAccount } from "../../application/use-cases/accounts/deactivate-account";
import type { GetCreditCardInvoice } from "../../application/use-cases/invoices/get-credit-card-invoice";
import type { ToggleInvoicePaid } from "../../application/use-cases/invoices/toggle-invoice-paid";

const accountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES),
  color: z.string().optional(),
  targetAmount: z.coerce.number().positive().optional(),
  currentAmount: z.coerce.number().nonnegative().optional(),
  showProgress: z.boolean().optional(),
  isReal: z.boolean().optional().default(false),
  initialBalance: z.coerce.number().nonnegative().optional(),
});

export interface AccountsRouterDeps {
  requireAuth: RequireAuth;
  getAccountBalances: GetAccountBalances;
  createAccount: CreateAccount;
  updateAccount: UpdateAccount;
  deactivateAccount: DeactivateAccount;
  getCreditCardInvoice: GetCreditCardInvoice;
  toggleInvoicePaid: ToggleInvoicePaid;
}

export function createAccountsRouter(deps: AccountsRouterDeps) {
  const router = new Hono<AppEnv>();
  router.use(deps.requireAuth);

  // Saldo acumulado de todo o histórico (month/year na query são ignorados).
  router.get("/", async (c) => {
    return c.json(await deps.getAccountBalances.execute(userIdOf(c), { kind: "all-time" }));
  });

  router.post("/", async (c) => {
    const body = await parseBody(c, accountSchema);
    return c.json(await deps.createAccount.execute(userIdOf(c), body), 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    const body = await parseBody(c, accountSchema);
    const account = await deps.updateAccount.execute(userIdOf(c), id, body);
    if (!account) return c.json({ error: "Conta não encontrada" }, 404);
    return c.json(account);
  });

  router.delete("/:id", async (c) => {
    const id = parseIdParam(c);
    const account = await deps.deactivateAccount.execute(userIdOf(c), id);
    if (!account) return c.json({ error: "Conta não encontrada" }, 404);
    return c.json({ ok: true });
  });

  router.get("/:id/invoice", async (c) => {
    const id = parseIdParam(c);
    const period = periodQuerySchema.safeParse(c.req.query());
    if (!period.success) httpError(400, "month e year são obrigatórios");
    const invoice = await deps.getCreditCardInvoice.execute(userIdOf(c), id, period.data);
    if (!invoice) return c.json({ error: "Conta não encontrada ou não é cartão" }, 404);
    return c.json(invoice);
  });

  router.patch("/:id/invoice/pay", async (c) => {
    const id = parseIdParam(c);
    const period = periodQuerySchema.safeParse(await readJson(c));
    if (!period.success) httpError(400, "month e year são obrigatórios");
    return c.json(await deps.toggleInvoicePaid.execute(userIdOf(c), id, period.data));
  });

  return router;
}
