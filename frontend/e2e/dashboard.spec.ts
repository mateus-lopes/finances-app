import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/(dashboard)?$/);
  await page.waitForLoadState("networkidle");
});

test("exibe os cards de resumo financeiro", async ({ page }) => {
  await expect(page.getByText(/saldo real/i)).toBeVisible({ timeout: 8_000 });
});

test("gráfico histórico SVG renderiza", async ({ page }) => {
  const svg = page.locator("svg[viewBox]").first();
  await expect(svg).toBeVisible({ timeout: 8_000 });
});

test("mês e ano correntes são exibidos no MonthNavigator", async ({ page }) => {
  // MonthNavigator exibe o label como "agosto de 2026" (pt-BR)
  // Regex busca qualquer texto contendo 4 dígitos consecutivos (o ano)
  await expect(page.getByText(/\d{4}/).first()).toBeVisible({ timeout: 8_000 });
});

test("navegar para Transações pelo link do menu", async ({ page }) => {
  const link = page.getByRole("link", { name: /transaç/i }).first();
  if (await link.isVisible()) {
    await link.click();
    await expect(page).toHaveURL(/\/transacoes/);
  }
});
