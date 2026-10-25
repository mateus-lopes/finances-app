import type { Hono } from "hono";
import type { Database } from "../../db/client";
import type { Clock } from "../../shared/kernel/clock";
import type { AppEnv, RequireAuth } from "../../shared/infrastructure/http/auth-context";
import type { LedgerApi } from "../ledger/contracts";
import type { PlanningApi } from "./contracts";
import { EnsureOccurrences } from "./application/use-cases/ensure-occurrences";
import { ListBillsForMonth } from "./application/use-cases/list-bills-for-month";
import { CreateBill } from "./application/use-cases/create-bill";
import { UpdateBill } from "./application/use-cases/update-bill";
import { DeactivateBill } from "./application/use-cases/deactivate-bill";
import { ToggleOccurrencePaid } from "./application/use-cases/toggle-occurrence-paid";
import { DrizzleBillRepository } from "./infrastructure/drizzle-bill-repository";
import { DrizzleOccurrenceRepository } from "./infrastructure/drizzle-occurrence-repository";
import { createBillsRouter } from "./presentation/http/bills.routes";

export interface PlanningModuleDeps {
  db: Database;
  clock: Clock;
  requireAuth: RequireAuth;
  ledger: LedgerApi;
}

export interface PlanningModule {
  billsRouter: Hono<AppEnv>;
  api: PlanningApi;
}

export function createPlanningModule({ db, clock, requireAuth, ledger }: PlanningModuleDeps): PlanningModule {
  const bills = new DrizzleBillRepository(db);
  const occurrences = new DrizzleOccurrenceRepository(db);
  const ensureOccurrences = new EnsureOccurrences(bills, occurrences);

  return {
    billsRouter: createBillsRouter({
      requireAuth,
      listBillsForMonth: new ListBillsForMonth(bills, ensureOccurrences, ledger),
      createBill: new CreateBill(bills),
      updateBill: new UpdateBill(bills),
      deactivateBill: new DeactivateBill(bills),
      ensureOccurrences,
      toggleOccurrencePaid: new ToggleOccurrencePaid(occurrences, clock),
    }),
    api: {
      ensureOccurrences: (userId, period) => ensureOccurrences.execute(userId, period),
    },
  };
}
