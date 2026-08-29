import { test as setup, expect } from "@playwright/test";
import { E2E_EMAIL, E2E_PASSWORD } from "./global-setup";

const AUTH_FILE = "./e2e/.auth/user.json";

setup("autenticar e salvar estado", async ({ page }) => {
  await page.goto("/");

  // Redireciona para login se não autenticado
  await page.waitForURL(/\/login/);

  await page.locator('input[type="email"]').fill(E2E_EMAIL);
  await page.locator('input[type="password"]').fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /entrar|login/i }).click();

  // Aguarda redirecionar para dashboard (rota raiz)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
