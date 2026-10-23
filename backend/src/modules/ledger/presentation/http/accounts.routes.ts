import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../../shared/infrastructure/http/async-handler";
import { userIdOf, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { parseBody, parseIdParam, periodQuerySchema } from "../../../../shared/infrastructure/http/validation";
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
  const router = Router();
  router.use(deps.requireAuth);

  // Saldo acumulado de todo o histórico (month/year na query são ignorados).
  router.get("/", asyncHandler(async (req, res) => {
    res.json(await deps.getAccountBalances.execute(userIdOf(req), { kind: "all-time" }));
  }));

  router.post("/", asyncHandler(async (req, res) => {
    const body = parseBody(accountSchema, req.body, res);
    if (!body) return;
    res.status(201).json(await deps.createAccount.execute(userIdOf(req), body));
  }));

  router.put("/:id", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const body = parseBody(accountSchema, req.body, res);
    if (!body) return;
    const account = await deps.updateAccount.execute(userIdOf(req), id, body);
    if (!account) { res.status(404).json({ error: "Conta não encontrada" }); return; }
    res.json(account);
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const account = await deps.deactivateAccount.execute(userIdOf(req), id);
    if (!account) { res.status(404).json({ error: "Conta não encontrada" }); return; }
    res.json({ ok: true });
  }));

  router.get("/:id/invoice", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const period = periodQuerySchema.safeParse(req.query);
    if (!period.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    const invoice = await deps.getCreditCardInvoice.execute(userIdOf(req), id, period.data);
    if (!invoice) { res.status(404).json({ error: "Conta não encontrada ou não é cartão" }); return; }
    res.json(invoice);
  }));

  router.patch("/:id/invoice/pay", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const period = periodQuerySchema.safeParse(req.body);
    if (!period.success) { res.status(400).json({ error: "month e year são obrigatórios" }); return; }
    res.json(await deps.toggleInvoicePaid.execute(userIdOf(req), id, period.data));
  }));

  return router;
}
