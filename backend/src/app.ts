import "dotenv/config";
import { createContainer } from "./bootstrap/container";
import { createHttpApp } from "./bootstrap/http-app";
import { isProduction, parseConfig } from "./shared/infrastructure/config/env";
import { memoryRateLimiter } from "./shared/infrastructure/http/rate-limiter";

/** App para o runtime Node (dev local e testes), configurado pelo `.env`. */
export const config = parseConfig(process.env);

const app = createHttpApp(createContainer({
  config,
  loginRateLimiter: memoryRateLimiter(isProduction(config) ? 10 : 10_000, 15 * 60 * 1000),
}).routes);

export default app;
