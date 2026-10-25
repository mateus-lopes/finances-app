import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { apiNotFound, errorHandler } from "../shared/infrastructure/http/error-handler";
import type { AppEnv } from "../shared/infrastructure/http/auth-context";
import type { ApiRoutes } from "./container";

/**
 * API sob /api. Em produção o SPA é servido pelos static assets do Worker na
 * mesma origem (ver wrangler.jsonc), então não há CORS e o cookie de sessão é first-party.
 */
export function createHttpApp(routes: ApiRoutes) {
  const api = new Hono<AppEnv>();

  api.use(secureHeaders());
  api.use(bodyLimit({
    maxSize: 2 * 1024 * 1024,
    onError: (c) => c.json({ error: "Corpo da requisição muito grande" }, 413),
  }));

  api.get("/health", (c) => c.json({ ok: true }));
  for (const [path, router] of routes) api.route(path, router);
  api.onError(errorHandler);

  // O notFound de um sub-app montado com route() é ignorado pelo Hono; fica na raiz.
  return new Hono().route("/api", api).notFound(apiNotFound);
}
