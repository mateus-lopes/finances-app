import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5174";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/global.setup.ts",
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "./e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: "cd ../backend && pnpm dev",
      url: `${BACKEND_URL}/api/auth/me`,
      reuseExistingServer: true,
      ignoreHTTPSErrors: true,
    },
    {
      command: "pnpm dev",
      url: FRONTEND_URL,
      reuseExistingServer: true,
    },
  ],
});
