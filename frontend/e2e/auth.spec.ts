import { test, expect } from "@playwright/test";

// Estes testes rodam sem storageState (precisam de tela de login limpa)
test.use({ storageState: { cookies: [], origins: [] } });

test("redireciona / para /login se não autenticado", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("login com credenciais válidas redireciona ao dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.locator('input[type="email"]').fill("playwright-e2e@test.local");
  await page.locator('input[type="password"]').fill("PlaywrightE2E123!");
  await page.getByRole("button", { name: /entrar|login/i }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 });
});

test("login com senha errada exibe erro", async ({ page }) => {
  await page.goto("/login");

  await page.locator('input[type="email"]').fill("playwright-e2e@test.local");
  await page.locator('input[type="password"]').fill("senhaerrrada123");
  await page.getByRole("button", { name: /entrar|login/i }).click();

  // Permanece na tela de login e exibe mensagem de erro
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/inválid|incorret|erro/i)).toBeVisible({ timeout: 5_000 });
});

test("logout limpa sessão e redireciona para login", async ({ page }) => {
  // Este teste usa o storageState padrão (autenticado via setup)
  // Mas como o describe usa storageState vazio, precisamos fazer login primeiro
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("playwright-e2e@test.local");
  await page.locator('input[type="password"]').fill("PlaywrightE2E123!");
  await page.getByRole("button", { name: /entrar|login/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 });

  // Acionar logout (botão ou menu)
  const logoutBtn = page.getByRole("button", { name: /sair|logout/i });
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
  } else {
    // Tentar via menu de perfil
    await page.getByRole("button", { name: /perfil|account|menu/i }).first().click();
    await page.getByRole("menuitem", { name: /sair|logout/i }).click();
  }

  await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
});
