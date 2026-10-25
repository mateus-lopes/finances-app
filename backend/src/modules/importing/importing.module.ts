import type { Hono } from "hono";
import type { AppEnv, RequireAuth } from "../../shared/infrastructure/http/auth-context";
import type { LedgerApi } from "../ledger/contracts";
import { PreviewImport } from "./application/use-cases/preview-import";
import { ConfirmImport } from "./application/use-cases/confirm-import";
import { OfxStatementReader } from "./infrastructure/ofx-statement-reader";
import { createImportRouter } from "./presentation/http/import.routes";

export interface ImportingModuleDeps {
  requireAuth: RequireAuth;
  ledger: LedgerApi;
}

/** Módulo independente: nenhum outro módulo depende dele (pode ser removido sem impacto). */
export interface ImportingModule {
  router: Hono<AppEnv>;
}

export function createImportingModule({ requireAuth, ledger }: ImportingModuleDeps): ImportingModule {
  return {
    router: createImportRouter({
      requireAuth,
      previewImport: new PreviewImport(new OfxStatementReader(), ledger),
      confirmImport: new ConfirmImport(ledger),
    }),
  };
}
