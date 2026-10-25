import { createContainer } from "./bootstrap/container";
import { createHttpApp } from "./bootstrap/http-app";
import { parseConfig } from "./shared/infrastructure/config/env";
import { cloudflareRateLimiter, type RateLimitBinding } from "./shared/infrastructure/http/rate-limiter";

/** Vars, secrets e bindings declarados no wrangler.jsonc. */
interface WorkerEnv extends Record<string, unknown> {
  LOGIN_LIMITER: RateLimitBinding;
}

type App = ReturnType<typeof createHttpApp>;

// Montado uma vez por isolate: config e bindings não mudam entre requisições,
// e o driver HTTP do Neon não mantém conexões abertas.
let app: App | undefined;

export default {
  fetch(request: Request, env: WorkerEnv, ctx: unknown): Response | Promise<Response> {
    app ??= createHttpApp(createContainer({
      config: parseConfig(env),
      loginRateLimiter: cloudflareRateLimiter(env.LOGIN_LIMITER),
    }).routes);
    return app.fetch(request, env, ctx as Parameters<App["fetch"]>[2]);
  },
};
