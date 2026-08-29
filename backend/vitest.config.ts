import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config(); // carrega .env existente antes dos testes

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true }, // banco compartilhado — 1 worker
    },
    env: {
      NODE_ENV: "test",
      PORT: "3002",
      JWT_SECRET: process.env.JWT_SECRET ?? "test-secret-key-minimum-32-chars-00",
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL ?? "",
      CORS_ORIGIN: "http://localhost:5174",
    },
    testTimeout: 30_000, // tolerância para latência Neon
    sequence: { concurrent: false },
  },
});
