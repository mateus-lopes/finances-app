import express, { Router } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { apiNotFound, errorHandler } from "../shared/infrastructure/http/error-handler";
import { serveSpa } from "../shared/infrastructure/http/spa";
import type { ApiRoutes } from "./container";

export interface HttpAppOptions {
  routes: ApiRoutes;
  /** Build do frontend; null = API pura (ex.: testes). */
  staticDir: string | null;
  isProduction: boolean;
}

/**
 * Monólito: a mesma origem serve a API em /api e o SPA em todo o resto.
 * Sem CORS e com cookie de sessão first-party.
 */
export function createHttpApp({ routes, staticDir, isProduction }: HttpAppOptions) {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        // Recursos externos não são usados; a IA é chamada pelo servidor.
        "upgrade-insecure-requests": isProduction ? [] : null,
      },
    },
  }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  const api = Router();
  // Usado pelo healthcheck do Railway antes de trocar o tráfego para o novo deploy.
  api.get("/health", (_req, res) => { res.json({ ok: true }); });
  for (const [path, router] of routes) api.use(path, router);
  api.use(apiNotFound);
  app.use("/api", api);

  if (staticDir) serveSpa(app, staticDir);

  app.use(errorHandler);
  return app;
}
