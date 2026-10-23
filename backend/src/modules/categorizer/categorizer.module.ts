import type { Router } from "express";
import type { RequireAuth } from "../../shared/infrastructure/http/auth-context";
import type { LedgerApi } from "../ledger/contracts";
import { ApplyKeywordRules } from "./application/use-cases/apply-keyword-rules";
import { createCategorizerRouter } from "./presentation/http/categorizer.routes";

export interface CategorizerModuleDeps {
  requireAuth: RequireAuth;
  ledger: LedgerApi;
}

export interface CategorizerModule {
  router: Router;
}

export function createCategorizerModule({ requireAuth, ledger }: CategorizerModuleDeps): CategorizerModule {
  return {
    router: createCategorizerRouter({ requireAuth, applyKeywordRules: new ApplyKeywordRules(ledger) }),
  };
}
