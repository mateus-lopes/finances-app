import fs from "node:fs";
import path from "node:path";
import { createContainer } from "./bootstrap/container";
import { createHttpApp } from "./bootstrap/http-app";
import { env, isProduction } from "./shared/infrastructure/config/env";

// src/ (tsx) e dist/ (build) ficam no mesmo nível → ../../frontend/dist nos dois casos.
const defaultStaticDir = path.resolve(__dirname, "../../frontend/dist");
const staticDir = env.STATIC_DIR ? path.resolve(env.STATIC_DIR) : defaultStaticDir;

const app = createHttpApp({
  routes: createContainer().routes,
  staticDir: env.NODE_ENV !== "test" && fs.existsSync(path.join(staticDir, "index.html")) ? staticDir : null,
  isProduction,
});

export default app;
